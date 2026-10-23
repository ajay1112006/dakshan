/**
 * Google Gemini AI Provider Module
 *
 * Exclusively powered by Google Gemini API (via GEMINI_API_KEY).
 * High-performance, streaming chat completion with automatic failover
 * between Google's OpenAI-compatible endpoint and native Gemini streamGenerateContent.
 */

import { ServerHealthStatus } from './types';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class LLMConnectionError extends Error {
  public baseUrl: string;
  public details?: string;

  constructor(message: string, baseUrl: string = 'Google Gemini API', details?: string) {
    super(message);
    this.name = 'LLMConnectionError';
    this.baseUrl = baseUrl;
    this.details = details;
  }
}

/**
 * Automatically maps deprecated model names to the active stable Gemini model.
 */
export function sanitizeGeminiModel(configuredModel?: string): string {
  if (!configuredModel) return 'gemini-2.5-flash';
  const clean = configuredModel.trim().replace(/^models\//, '');
  const deprecated = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-1.5-pro-latest',
    'gemini-2.0-flash',
    'gemini-1.0-pro',
    'default',
  ];
  if (deprecated.includes(clean)) {
    return 'gemini-2.5-flash';
  }
  return clean;
}

/**
 * Retrieves Gemini configuration from environment variables.
 */
export function getLLMConfig() {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  const rawModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const model = sanitizeGeminiModel(rawModel);
  const temperature = parseFloat(process.env.LLM_TEMPERATURE || '0.7');
  const timeoutMs = parseInt(process.env.LLM_TIMEOUT_MS || '45000', 10);

  return {
    apiKey,
    model,
    temperature,
    timeoutMs,
    hasKey: apiKey.length > 0,
  };
}

/**
 * Streams a chat completion directly from Google Gemini API.
 */
export async function streamChatCompletion(messages: LLMMessage[]): Promise<ReadableStream<Uint8Array>> {
  const config = getLLMConfig();

  if (!config.hasKey) {
    throw new LLMConnectionError(
      'Missing GEMINI_API_KEY. Please set your Gemini API key in your environment variables.',
      'Google Gemini API'
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  let lastErrorDetail = '';
  const candidateModels = Array.from(new Set([config.model, 'gemini-2.5-flash']));

  for (const modelToTry of candidateModels) {
    // 1. Attempt Google's official OpenAI-compatible endpoint
    try {
      const openAiEndpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
      const res = await fetch(openAiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: modelToTry,
          messages,
          temperature: config.temperature,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (res.ok && res.body) {
        clearTimeout(timeoutId);
        return parseSSEStream(res.body);
      }

      const errText = await res.text().catch(() => '');
      lastErrorDetail = `OpenAI endpoint (${modelToTry}) status ${res.status}: ${errText}`;
    } catch (err: unknown) {
      lastErrorDetail = err instanceof Error ? err.message : String(err);
    }

    // 2. Fallback to Google's native Gemini streamGenerateContent REST endpoint
    try {
      const nativeEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelToTry}:streamGenerateContent?alt=sse&key=${config.apiKey}`;

      const systemMsg = messages.find((m) => m.role === 'system');
      const chatMsgs = messages.filter((m) => m.role !== 'system');

      const nativeBody: Record<string, unknown> = {
        contents: chatMsgs.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          temperature: config.temperature,
        },
      };

      if (systemMsg) {
        nativeBody.system_instruction = {
          parts: [{ text: systemMsg.content }],
        };
      }

      const nativeRes = await fetch(nativeEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nativeBody),
        signal: controller.signal,
      });

      if (nativeRes.ok && nativeRes.body) {
        clearTimeout(timeoutId);
        return parseSSEStream(nativeRes.body);
      }

      const nativeErr = await nativeRes.text().catch(() => '');
      lastErrorDetail = `Native REST (${modelToTry}) status ${nativeRes.status}: ${nativeErr}`;
    } catch (err: unknown) {
      lastErrorDetail = err instanceof Error ? err.message : String(err);
    }
  }

  clearTimeout(timeoutId);

  throw new LLMConnectionError(
    'Failed to communicate with Google Gemini API. Please check your GEMINI_API_KEY.',
    'Google Gemini API',
    lastErrorDetail
  );
}

/**
 * Universal SSE stream parser supporting both OpenAI chunks and Gemini candidate chunks.
 */
function parseSSEStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(streamController) {
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;

            if (trimmed === 'data: [DONE]') {
              streamController.close();
              return;
            }

            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.slice(6);
              try {
                const parsed = JSON.parse(dataStr);
                let contentChunk: string | undefined;

                if (parsed.choices?.[0]?.delta?.content !== undefined) {
                  contentChunk = parsed.choices[0].delta.content;
                } else if (parsed.candidates?.[0]?.content?.parts) {
                  contentChunk = parsed.candidates[0].content.parts
                    .map((p: { text?: string }) => p.text || '')
                    .join('');
                }

                if (contentChunk) {
                  streamController.enqueue(encoder.encode(contentChunk));
                }
              } catch {
                // Ignore SSE non-JSON or heartbeat payloads
              }
            }
          }
        }

        if (buffer.trim().startsWith('data: ') && buffer.trim() !== 'data: [DONE]') {
          try {
            const parsed = JSON.parse(buffer.trim().slice(6));
            let contentChunk: string | undefined;

            if (parsed.choices?.[0]?.delta?.content !== undefined) {
              contentChunk = parsed.choices[0].delta.content;
            } else if (parsed.candidates?.[0]?.content?.parts) {
              contentChunk = parsed.candidates[0].content.parts
                .map((p: { text?: string }) => p.text || '')
                .join('');
            }

            if (contentChunk) {
              streamController.enqueue(encoder.encode(contentChunk));
            }
          } catch {
            // Ignore
          }
        }

        streamController.close();
      } catch (err) {
        streamController.error(err);
      } finally {
        reader.releaseLock();
      }
    },
  });
}

/**
 * Health check to verify Google Gemini connectivity.
 */
export async function checkLLMServerHealth(): Promise<ServerHealthStatus> {
  const config = getLLMConfig();
  const startTime = Date.now();

  if (!config.hasKey) {
    return {
      status: 'unreachable',
      providerUrl: 'Google Gemini API',
      model: config.model,
      message: 'GEMINI_API_KEY is not configured',
    };
  }

  const candidateModels = Array.from(new Set([config.model, 'gemini-2.5-flash']));

  for (const modelToTry of candidateModels) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelToTry}?key=${config.apiKey}`,
        { method: 'GET', signal: controller.signal }
      ).finally(() => clearTimeout(timeoutId));

      const latencyMs = Date.now() - startTime;
      if (res.ok) {
        return {
          status: 'connected',
          providerUrl: 'Google Gemini Cloud API',
          model: modelToTry,
          latencyMs,
          message: `Connected to Google Gemini (${modelToTry}, ${latencyMs}ms)`,
        };
      }
    } catch {
      // try next candidate
    }
  }

  return {
    status: 'unreachable',
    providerUrl: 'Google Gemini Cloud API',
    model: config.model,
    message: 'Could not connect to Google Gemini API (check API key)',
  };
}
