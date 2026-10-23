/**
 * Swappable LLM Provider Module
 *
 * Supports:
 * 1. Google Gemini API (via GEMINI_API_KEY or GOOGLE_API_KEY) with native streaming
 * 2. Local GGUF model servers (llama.cpp server, Ollama, LM Studio) via OpenAI-compatible endpoints
 */

import { generateMockWasteResponse } from './mock-llm';
import { ServerHealthStatus } from './types';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class LLMConnectionError extends Error {
  public baseUrl: string;
  public details?: string;

  constructor(message: string, baseUrl: string, details?: string) {
    super(message);
    this.name = 'LLMConnectionError';
    this.baseUrl = baseUrl;
    this.details = details;
  }
}

/**
 * Automatically maps deprecated or missing model names to the active stable Gemini model.
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
 * Retrieves configuration from environment variables with safe defaults.
 * Prioritizes Google Gemini when GEMINI_API_KEY is configured.
 */
export function getLLMConfig() {
  const geminiApiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  const hasGeminiKey = geminiApiKey.length > 0;

  // Prioritize Gemini if a valid key is provided, unless FORCE_LOCAL_LLM is explicitly true
  const forceLocal = process.env.FORCE_LOCAL_LLM === 'true' || process.env.USE_LOCAL_LLM === 'true';
  const isGemini = hasGeminiKey && !forceLocal;

  const defaultBaseUrl = isGemini
    ? 'https://generativelanguage.googleapis.com/v1beta/openai'
    : 'http://127.0.0.1:8080/v1';

  const rawModel = isGemini
    ? (process.env.GEMINI_MODEL || 'gemini-2.5-flash')
    : (process.env.LLM_MODEL || 'default');

  const model = isGemini ? sanitizeGeminiModel(rawModel) : rawModel;

  const baseUrl = isGemini
    ? 'https://generativelanguage.googleapis.com/v1beta/openai'
    : (process.env.LLM_BASE_URL || defaultBaseUrl).replace(/\/+$/, '');

  const apiKey = isGemini ? geminiApiKey : (process.env.LLM_API_KEY || 'not-needed');
  const temperature = parseFloat(process.env.LLM_TEMPERATURE || (isGemini ? '0.7' : '0.2'));
  const timeoutMs = parseInt(process.env.LLM_TIMEOUT_MS || '45000', 10);

  // Fallback is strictly disabled for Gemini so user gets real, dynamic responses and never pre-edited texts
  const enableFallback = !isGemini && process.env.ENABLE_OFFLINE_FALLBACK === 'true';

  return {
    isGemini,
    geminiApiKey,
    baseUrl,
    model,
    apiKey,
    temperature,
    timeoutMs,
    enableFallback,
  };
}

/**
 * Streams a chat completion response from Google Gemini or the local inference server.
 * Returns a standard ReadableStream of text chunks.
 */
export async function streamChatCompletion(messages: LLMMessage[]): Promise<ReadableStream<Uint8Array>> {
  const config = getLLMConfig();

  if (config.isGemini) {
    return streamGemini(messages, config);
  }

  return streamOpenAICompat(messages, config);
}

/**
 * Streams response from Google Gemini.
 * Tries Google's official OpenAI-compatible endpoint first, then automatically fails over
 * to Google's native Gemini streamGenerateContent REST API if needed.
 * Includes automatic model fallback to gemini-2.5-flash if a deprecated model was configured in Vercel.
 */
async function streamGemini(
  messages: LLMMessage[],
  config: ReturnType<typeof getLLMConfig>
): Promise<ReadableStream<Uint8Array>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  let lastErrorDetail = '';
  // Try candidate models: primary sanitized model first, then gemini-2.5-flash as guaranteed fallback
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
      console.warn('Gemini OpenAI endpoint attempt failed, trying native REST API:', lastErrorDetail);
    } catch (err: unknown) {
      lastErrorDetail = err instanceof Error ? err.message : String(err);
      console.warn('Gemini OpenAI endpoint error, falling back to native REST API:', lastErrorDetail);
    }

    // 2. Attempt Google's native Gemini streamGenerateContent REST endpoint
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
      console.warn('Gemini Native REST attempt failed:', lastErrorDetail);
    } catch (err: unknown) {
      lastErrorDetail = err instanceof Error ? err.message : String(err);
    }
  }

  clearTimeout(timeoutId);

  throw new LLMConnectionError(
    `Failed to get response from Google Gemini API. Please check your API key and connection.`,
    'Google Gemini Cloud API',
    lastErrorDetail
  );
}

/**
 * Streams response from a local or self-hosted OpenAI-compatible server (llama-server, Ollama, vLLM).
 */
async function streamOpenAICompat(
  messages: LLMMessage[],
  config: ReturnType<typeof getLLMConfig>
): Promise<ReadableStream<Uint8Array>> {
  const endpoint = `${config.baseUrl}/chat/completions`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature,
        stream: true,
      }),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const errorMsg = err instanceof Error ? err.message : String(err);

    if (config.enableFallback) {
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
      return createFallbackStream(lastUserMsg);
    }

    throw new LLMConnectionError(
      `Could not reach the local LLM server at "${endpoint}". Please make sure your server is running.`,
      config.baseUrl,
      errorMsg
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    if (config.enableFallback) {
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
      return createFallbackStream(lastUserMsg);
    }
    throw new LLMConnectionError(
      `Inference server returned error ${response.status} (${response.statusText}): ${errorText}`,
      config.baseUrl,
      errorText
    );
  }

  if (!response.body) {
    throw new LLMConnectionError('Inference server returned an empty response body.', config.baseUrl);
  }

  return parseSSEStream(response.body);
}

/**
 * Universal SSE stream parser supporting both OpenAI delta chunks
 * and Google Gemini candidate parts chunks.
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
                // Ignore SSE heartbeat or non-JSON payloads
              }
            }
          }
        }

        // Process any remaining buffered text
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
 * Creates a streaming response from the fallback generator for offline testing.
 */
function createFallbackStream(userQuery: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const content = generateMockWasteResponse(userQuery);

  const chunks = content.match(/.{1,12}/g) || [content];

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        await new Promise((resolve) => setTimeout(resolve, 15));
      }
      controller.close();
    },
  });
}

/**
 * Health check to verify whether Google Gemini or the local server is reachable.
 */
export async function checkLLMServerHealth(): Promise<ServerHealthStatus> {
  const config = getLLMConfig();
  const startTime = Date.now();

  if (config.isGemini) {
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

  // Local OpenAI-compatible server health check
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${config.baseUrl}/models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    const latencyMs = Date.now() - startTime;

    if (res.ok) {
      return {
        status: 'connected',
        providerUrl: config.baseUrl,
        model: config.model,
        latencyMs,
        message: `Connected to local server (${latencyMs}ms)`,
      };
    }

    return {
      status: 'unreachable',
      providerUrl: config.baseUrl,
      model: config.model,
      message: `Inference server returned status ${res.status}`,
    };
  } catch {
    return {
      status: config.enableFallback ? 'mock_mode' : 'unreachable',
      providerUrl: config.baseUrl,
      model: config.model,
      message: `Could not connect to ${config.baseUrl}`,
    };
  }
}
