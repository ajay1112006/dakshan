/**
 * Swappable LLM Provider Module
 *
 * Supports:
 * 1. Google Gemini API (via GEMINI_API_KEY with auto-failover between OpenAI-compat and Native REST endpoints)
 * 2. Local GGUF model servers (llama.cpp's `llama-server`, Ollama, LM Studio) exposing OpenAI-compatible endpoints
 * 3. Built-in intelligent waste awareness fallback when servers are offline
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
 * Retrieves sanitized configuration from environment variables with safe defaults.
 */
export function getLLMConfig() {
  const geminiApiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  const hasGeminiKey = geminiApiKey.length > 0;

  // If user provided a Gemini key and hasn't explicitly pointed to a local server, use Gemini
  const isGemini = hasGeminiKey && (!process.env.LLM_BASE_URL || process.env.LLM_BASE_URL.includes('googleapis.com'));

  const defaultBaseUrl = isGemini
    ? 'https://generativelanguage.googleapis.com/v1beta/openai'
    : 'http://127.0.0.1:8080/v1';

  const defaultModel = isGemini
    ? (process.env.GEMINI_MODEL || 'gemini-2.5-flash')
    : (process.env.LLM_MODEL || 'default');

  const baseUrl = (process.env.LLM_BASE_URL || defaultBaseUrl).replace(/\/+$/, '');
  const model = process.env.LLM_MODEL || defaultModel;
  const apiKey = isGemini ? geminiApiKey : (process.env.LLM_API_KEY || 'not-needed');
  const temperature = parseFloat(process.env.LLM_TEMPERATURE || '0.2');
  const timeoutMs = parseInt(process.env.LLM_TIMEOUT_MS || '30000', 10);
  const enableFallback = process.env.ENABLE_OFFLINE_FALLBACK !== 'false';

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
 * Streams a chat completion response from Google Gemini or the local OpenAI-compatible inference server.
 * Returns a standard ReadableStream of text chunks.
 */
export async function streamChatCompletion(messages: LLMMessage[]): Promise<ReadableStream<Uint8Array>> {
  const config = getLLMConfig();

  // If Gemini API is configured, use Gemini stream pipeline
  if (config.isGemini) {
    return streamGeminiWithFallback(messages, config);
  }

  // Otherwise, use local / custom OpenAI-compatible server endpoint
  return streamOpenAICompat(messages, config);
}

/**
 * Streams response from Google Gemini.
 * Attempts Google's official OpenAI-compatible endpoint first; automatically fails over
 * to Google's native streamGenerateContent REST API if needed.
 */
async function streamGeminiWithFallback(
  messages: LLMMessage[],
  config: ReturnType<typeof getLLMConfig>
): Promise<ReadableStream<Uint8Array>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  // 1. Attempt Google's official OpenAI-compatible endpoint
  try {
    const openAiEndpoint = `${config.baseUrl}/chat/completions`;
    const res = await fetch(openAiEndpoint, {
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

    if (res.ok && res.body) {
      clearTimeout(timeoutId);
      return parseSSEStream(res.body);
    }
  } catch {
    // Fall through to native Gemini endpoint
  }

  // 2. Attempt Google's native Gemini streamGenerateContent REST endpoint
  try {
    const model = config.model.includes('gemini') ? config.model : 'gemini-2.5-flash';
    const nativeEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${config.apiKey}`;

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
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (config.enableFallback) {
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
      return createFallbackStream(lastUserMsg);
    }
    throw new LLMConnectionError('Failed to connect to Google Gemini API', 'Google Gemini', String(err));
  } finally {
    clearTimeout(timeoutId);
  }

  // If Gemini calls failed and fallback is enabled
  if (config.enableFallback) {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
    return createFallbackStream(lastUserMsg);
  }

  throw new LLMConnectionError('Could not reach Google Gemini API or local inference server', config.baseUrl);
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

    // If local inference server is offline and fallback is enabled, deliver intelligent fallback
    if (config.enableFallback) {
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
      return createFallbackStream(lastUserMsg);
    }

    throw new LLMConnectionError(
      `Could not reach the local GGUF inference server at "${endpoint}". Please make sure your server (e.g. llama-server or Ollama) is running.`,
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
                // Supports both OpenAI (choices[0].delta.content) and native Gemini (candidates[0].content.parts[0].text)
                const contentChunk =
                  parsed.choices?.[0]?.delta?.content ||
                  parsed.candidates?.[0]?.content?.parts?.[0]?.text;

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
            const contentChunk =
              parsed.choices?.[0]?.delta?.content ||
              parsed.candidates?.[0]?.content?.parts?.[0]?.text;

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
 * Creates a streaming response from the fallback generator.
 * Streams clean, direct responses without intrusive debug or disclaimer notices.
 */
function createFallbackStream(userQuery: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const content = generateMockWasteResponse(userQuery);

  // Split into small chunks to simulate natural streaming cadence
  const chunks = content.match(/.{1,12}/g) || [content];

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        // Micro-delay between chunks to provide realistic streaming visual
        await new Promise((resolve) => setTimeout(resolve, 15));
      }
      controller.close();
    },
  });
}

/**
 * Health check to verify whether Google Gemini or the local GGUF server is reachable.
 */
export async function checkLLMServerHealth(): Promise<ServerHealthStatus> {
  const config = getLLMConfig();
  const startTime = Date.now();

  // If Gemini is active
  if (config.isGemini) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const model = config.model.includes('gemini') ? config.model : 'gemini-2.5-flash';

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${config.apiKey}`,
        { method: 'GET', signal: controller.signal }
      ).finally(() => clearTimeout(timeoutId));

      const latencyMs = Date.now() - startTime;
      if (res.ok) {
        return {
          status: 'connected',
          providerUrl: 'Google Gemini Cloud API',
          model,
          latencyMs,
          message: `Connected to Google Gemini (${model}, ${latencyMs}ms)`,
        };
      }
      return {
        status: config.enableFallback ? 'mock_mode' : 'unreachable',
        providerUrl: 'Google Gemini Cloud API',
        model,
        message: `Gemini API returned status ${res.status}`,
      };
    } catch {
      return {
        status: config.enableFallback ? 'mock_mode' : 'unreachable',
        providerUrl: 'Google Gemini Cloud API',
        model: config.model,
        message: 'Could not connect to Google Gemini API (offline fallback active)',
      };
    }
  }

  // Local / OpenAI-compatible server health check
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
        message: `Successfully connected to local GGUF server (${latencyMs}ms)`,
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
      message: `Could not connect to ${config.baseUrl} (local fallback enabled)`,
    };
  }
}
