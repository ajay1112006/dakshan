'use client';

import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '@/lib/types';
import { MessageBubble } from './MessageBubble';
import { Bot, Sparkles } from 'lucide-react';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  streamingMessageId: string | null;
  onSelectPrompt: (prompt: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading,
  streamingMessageId,
  onSelectPrompt,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll whenever messages or streaming updates occur
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessageId, isLoading]);

  if (messages.length === 0) {
    return (
      <div className="chat-viewport empty-viewport">
        <div className="empty-chat-state">
          <div className="empty-icon-circle" aria-hidden="true">
            <Sparkles size={28} />
          </div>
          <h2 className="empty-title">Dakshan AI Assistant</h2>
          <p className="empty-subtitle">
            Your conversational AI assistant powered by Groq. Ask anything, brainstorm ideas, write code, or ask for eco-friendly waste advice.
          </p>

          <div className="empty-suggestion-chips">
            <button
              type="button"
              className="chip-btn"
              onClick={() => onSelectPrompt('Tell me a fascinating fact about the universe.')}
            >
              ✨ Universe fact
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() => onSelectPrompt('Where does a used pizza box go?')}
            >
              🍕 Pizza box sorting
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() => onSelectPrompt('Write a clean Python script to fetch and format weather data.')}
            >
              💻 Python script
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() => onSelectPrompt('How do I safely dispose of lithium-ion batteries?')}
            >
              🔋 Battery disposal
            </button>
          </div>
        </div>
        <div ref={bottomRef} />
      </div>
    );
  }

  return (
    <div className="chat-viewport" role="log" aria-live="polite">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isStreaming={message.id === streamingMessageId}
        />
      ))}

      {isLoading && !streamingMessageId && (
        <div className="message-row assistant">
          <div className="avatar bot-avatar" aria-hidden="true">
            <Bot size={18} />
          </div>
          <div className="bubble">
            <div className="typing-indicator" aria-label="Dakshan AI is analyzing your question...">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
