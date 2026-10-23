/**
 * Core type definitions for the Waste Awareness Chatbot
 */

export type MessageRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  category?: 'recycling' | 'compost' | 'landfill' | 'hazardous' | 'ewaste' | 'general';
}

export interface ChatRequestPayload {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface LLMConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
  temperature?: number;
  timeoutMs?: number;
}

export interface ServerHealthStatus {
  status: 'connected' | 'unreachable' | 'mock_mode';
  providerUrl: string;
  model: string;
  latencyMs?: number;
  message?: string;
}
