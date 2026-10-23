/**
 * Groq AI Provider Module
 *
 * Exclusively powered by Groq's ultra-fast LPU inference API (via GROQ_API_KEY).
 * Automatically selects and fails over across high-performance models (openai/gpt-oss-120b,
 * openai/gpt-oss-20b, qwen/qwen3.8-27b, and llama models).
 */

import { ServerHealthStatus } from './types';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class LLMConnectionError extends Error {
  public baseUrl: string;
  public details?: string;

  constructor(message: string, baseUrl: string = 'Groq Cloud API', details?: string) {
    super(message);
    this.name = 'LLMConnectionError';
    this.baseUrl = baseUrl;
    this.details = details;
  }
}

/**
 * Normalizes and maps the Groq model name to active available models.
 */
export function sanitizeGroqModel(configuredModel?: string): string {
  if (!configuredModel) return 'openai/gpt-oss-120b';
  const clean = configuredModel.trim();
  // Map any unavailable/restricted llama names to the active flagship models on Groq
  if (clean === 'llama-3.3-70b-versatile' || clean === 'llama3-70b' || clean === 'llama-3-70b') {
    return 'openai/gpt-oss-120b';
  }
  if (clean === 'llama-3.1-8b-instant' || clean === 'llama3-8b' || clean === 'llama-3-8b') {
    return 'openai/gpt-oss-20b';
  }
  return clean;
}

/**
 * Retrieves configuration from environment variables.
 * Prioritizes GROQ_API_KEY.
 */
export function getLLMConfig() {
  const groqApiKey = (process.env.GROQ_API_KEY || '').trim();
  const geminiApiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();

  // Primary: Groq; Fallback: Gemini (if Groq key is absent)
  const isGroq = groqApiKey.length > 0 || geminiApiKey.length === 0;
  const apiKey = isGroq ? groqApiKey : geminiApiKey;

  const rawModel = isGroq
    ? (process.env.GROQ_MODEL || 'openai/gpt-oss-120b')
    : (process.env.GEMINI_MODEL || 'gemini-2.5-flash');

  const model = isGroq ? sanitizeGroqModel(rawModel) : rawModel;
  const temperature = parseFloat(process.env.LLM_TEMPERATURE || '0.7');
  const timeoutMs = parseInt(process.env.LLM_TIMEOUT_MS || '45000', 10);

  return {
    isGroq,
    apiKey,
    model,
    temperature,
    timeoutMs,
    hasKey: apiKey.length > 0,
  };
}

/**
 * Streams chat completion from Groq API (or Gemini as failover).
 */
export async function streamChatCompletion(messages: LLMMessage[]): Promise<ReadableStream<Uint8Array>> {
  const config = getLLMConfig();

  if (!config.hasKey) {
    throw new LLMConnectionError(
      'Missing GROQ_API_KEY. Please set your Groq API key in .env.local or your Vercel Environment Variables.',
      'Groq Cloud API'
    );
  }

  if (config.isGroq) {
    return streamGroq(messages, config);
  }

  return streamGemini(messages, config);
}

/**
 * Streams completion from Groq API with automatic model failover.
 */
async function streamGroq(
  messages: LLMMessage[],
  config: ReturnType<typeof getLLMConfig>
): Promise<ReadableStream<Uint8Array>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  let lastErrorDetail = '';
  // Try candidate models in prioritized order to guarantee immediate response
  const candidateModels = Array.from(
    new Set([
      config.model,
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'qwen/qwen3.8-27b',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
    ])
  );

  for (const modelToTry of candidateModels) {
    try {
      const groqEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
      const res = await fetch(groqEndpoint, {
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
      lastErrorDetail = `Groq API (${modelToTry}) status ${res.status}: ${errText}`;
      console.warn('Groq model attempt failed, trying next candidate:', lastErrorDetail);
    } catch (err: unknown) {
      lastErrorDetail = err instanceof Error ? err.message : String(err);
      console.warn('Groq fetch error:', lastErrorDetail);
    }
  }

  clearTimeout(timeoutId);

  let friendlyMessage = 'Failed to communicate with Groq API. Please check your GROQ_API_KEY.';
  if (lastErrorDetail.includes('429') || lastErrorDetail.includes('rate_limit_exceeded')) {
    friendlyMessage = 'Groq API rate limit exceeded. Please wait a moment and click Retry.';
  } else if (lastErrorDetail.includes('401') || lastErrorDetail.includes('invalid_api_key')) {
    friendlyMessage = 'Invalid Groq API key. Please check your GROQ_API_KEY in your environment variables.';
  } else if (lastErrorDetail.includes('404') || lastErrorDetail.includes('model_not_found')) {
    friendlyMessage = 'Configured Groq model was not found. Please verify your GROQ_MODEL setting.';
  }

  throw new LLMConnectionError(
    friendlyMessage,
    'Groq Cloud API',
    lastErrorDetail
  );
}

/**
 * Fallback to Gemini if user still uses GEMINI_API_KEY.
 */
async function streamGemini(
  messages: LLMMessage[],
  config: ReturnType<typeof getLLMConfig>
): Promise<ReadableStream<Uint8Array>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
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

    const err = await res.text().catch(() => '');
    throw new Error(err);
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    throw new LLMConnectionError(
      'Failed to communicate with AI API: ' + (err instanceof Error ? err.message : String(err)),
      'Google Gemini API'
    );
  }
}

/**
 * Universal SSE stream parser supporting OpenAI-compatible delta streams (Groq & OpenAI).
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
                const contentChunk =
                  parsed.choices?.[0]?.delta?.content ||
                  parsed.candidates?.[0]?.content?.parts?.[0]?.text;

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
 * Health check to verify Groq API connectivity.
 */
export async function checkLLMServerHealth(): Promise<ServerHealthStatus> {
  const config = getLLMConfig();
  const startTime = Date.now();

  if (!config.hasKey) {
    return {
      status: 'unreachable',
      providerUrl: 'Groq Cloud API',
      model: config.model,
      message: 'GROQ_API_KEY is not configured',
    };
  }

  if (config.isGroq) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch('https://api.groq.com/openai/v1/models', {
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
          providerUrl: 'Groq Cloud LPU API',
          model: config.model,
          latencyMs,
          message: `Connected to Groq (${config.model}, ${latencyMs}ms)`,
        };
      }

      return {
        status: 'unreachable',
        providerUrl: 'Groq Cloud LPU API',
        model: config.model,
        message: `Groq API returned status ${res.status}`,
      };
    } catch {
      return {
        status: 'unreachable',
        providerUrl: 'Groq Cloud LPU API',
        model: config.model,
        message: 'Could not connect to Groq API (check GROQ_API_KEY)',
      };
    }
  }

  // Fallback Gemini health check
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash?key=${config.apiKey}`,
      { method: 'GET', signal: controller.signal }
    ).finally(() => clearTimeout(timeoutId));

    const latencyMs = Date.now() - startTime;
    if (res.ok) {
      return {
        status: 'connected',
        providerUrl: 'Google Gemini Cloud API',
        model: 'gemini-2.5-flash',
        latencyMs,
        message: `Connected to Google Gemini (${latencyMs}ms)`,
      };
    }
    return {
      status: 'unreachable',
      providerUrl: 'Google Gemini Cloud API',
      model: 'gemini-2.5-flash',
      message: `Gemini API returned status ${res.status}`,
    };
  } catch {
    return {
      status: 'unreachable',
      providerUrl: 'Google Gemini Cloud API',
      model: 'gemini-2.5-flash',
      message: 'Could not connect to Google Gemini API',
    };
  }
}
