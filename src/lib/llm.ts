/**
 * Swappable LLM Provider Module
 *
 * Connects to a local GGUF model server (such as llama.cpp's `llama-server`, Ollama,
 * or LM Studio) exposing an OpenAI-compatible `/v1/chat/completions` endpoint.
 *
 * All connection details and model names are driven entirely by environment variables,
 * with no hardcoded endpoints or model paths.
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
  const baseUrl = (process.env.LLM_BASE_URL || 'http://127.0.0.1:8080/v1').replace(/\/+$/, '');
  const model = process.env.LLM_MODEL || 'default';
  const apiKey = process.env.LLM_API_KEY || 'not-needed';
  const temperature = parseFloat(process.env.LLM_TEMPERATURE || '0.2');
  const timeoutMs = parseInt(process.env.LLM_TIMEOUT_MS || '30000', 10);
  const enableFallback = process.env.ENABLE_OFFLINE_FALLBACK !== 'false';

  return {
    baseUrl,
    model,
    apiKey,
    temperature,
    timeoutMs,
    enableFallback,
  };
}

/**
 * Streams a chat completion response from the local OpenAI-compatible inference server.
 * Returns a standard ReadableStream of text chunks.
 */
export async function streamChatCompletion(messages: LLMMessage[]): Promise<ReadableStream<Uint8Array>> {
  const config = getLLMConfig();
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

    // If local inference server is offline and fallback is enabled, deliver intelligent fallback with notice
    if (config.enableFallback) {
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
      return createFallbackStream(lastUserMsg, config.baseUrl);
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
      return createFallbackStream(lastUserMsg, config.baseUrl);
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

  // Parse SSE stream (data: {...}\n\n) and emit text deltas
  const reader = response.body.getReader();
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
                const contentChunk = parsed.choices?.[0]?.delta?.content;
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
            const contentChunk = parsed.choices?.[0]?.delta?.content;
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
 * Creates a streaming response from the fallback generator with a gentle notice.
 */
function createFallbackStream(userQuery: string, baseUrl: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const content = generateMockWasteResponse(userQuery);
  const isLocalhost = baseUrl.includes('127.0.0.1') || baseUrl.includes('localhost');
  const notice = isLocalhost
    ? `> ℹ️ *Note: Running in offline awareness mode because local inference server at \`${baseUrl}\` was not reached. (Locally: run \`npm run model:start\`. On Vercel: set a cloud \`LLM_BASE_URL\` in Vercel settings).*\n\n`
    : `> ℹ️ *Note: Inference server at \`${baseUrl}\` was unreachable. Running in offline awareness mode.*\n\n`;
  const fullText = notice + content;

  // Split into chunks to simulate natural streaming cadence
  const chunks = fullText.match(/.{1,12}/g) || [fullText];

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        // Micro-delay between chunks to provide realistic streaming visual
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      controller.close();
    },
  });
}

/**
 * Health check to verify whether the configured GGUF server is reachable.
 */
export async function checkLLMServerHealth(): Promise<ServerHealthStatus> {
  const config = getLLMConfig();
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    // Most OpenAI-compatible servers respond to /models
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
