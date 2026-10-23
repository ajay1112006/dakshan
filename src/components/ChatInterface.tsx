'use client';

import React, { useState, useRef } from 'react';
import { ChatMessage } from '@/lib/types';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setStreamingId(null);
  };

  const handleSendMessage = async (userText: string) => {
    const trimmed = userText.trim();
    if (!trimmed || isLoading) return;

    setErrorMessage(null);
    setLastFailedPrompt(null);
    setInput('');

    // Append user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    // Setup assistant placeholder message
    const assistantMessageId = `assistant-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(true);
    setStreamingId(assistantMessageId);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const payloadMessages = newMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: payloadMessages }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errDetail = 'Failed to generate response.';
        try {
          const errJson = await response.json();
          errDetail = errJson.error || errDetail;
        } catch {
          errDetail = `Server responded with status ${response.status} (${response.statusText})`;
        }
        throw new Error(errDetail);
      }

      if (!response.body) {
        throw new Error('Received an empty response stream from server.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const textChunk = decoder.decode(value, { stream: true });
        accumulatedContent += textChunk;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: accumulatedContent }
              : msg
          )
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      const msg = err instanceof Error ? err.message : 'An error occurred while contacting the AI model.';
      setErrorMessage(msg);
      setLastFailedPrompt(trimmed);

      setMessages((prev) =>
        prev.filter((m) => !(m.id === assistantMessageId && m.content.trim() === ''))
      );
    } finally {
      setIsLoading(false);
      setStreamingId(null);
      abortControllerRef.current = null;
    }
  };

  const handleRetry = () => {
    if (lastFailedPrompt) {
      handleSendMessage(lastFailedPrompt);
    }
  };

  const handleReset = () => {
    handleStop();
    setMessages([]);
    setErrorMessage(null);
    setLastFailedPrompt(null);
    setInput('');
  };

  return (
    <div className="chatbox-container">
      <ChatHeader
        onReset={handleReset}
        hasMessages={messages.length > 0}
      />

      <MessageList
        messages={messages}
        isLoading={isLoading}
        streamingMessageId={streamingId}
        onSelectPrompt={(prompt) => handleSendMessage(prompt)}
      />

      <ChatInput
        input={input}
        setInput={setInput}
        onSubmit={() => handleSendMessage(input)}
        onStop={handleStop}
        isLoading={isLoading}
        errorMessage={errorMessage}
        onDismissError={() => setErrorMessage(null)}
        onRetry={lastFailedPrompt ? handleRetry : undefined}
      />
    </div>
  );
};
