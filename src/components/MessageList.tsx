'use client';

import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '@/lib/types';
import { MessageBubble } from './MessageBubble';
import { Bot, Sprout } from 'lucide-react';

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
            <Sprout size={28} />
          </div>
          <h2 className="empty-title">AI Waste Awareness Chat</h2>
          <p className="empty-subtitle">
            Ask how to sort any item, recycle properly, compost, or handle tricky waste.
          </p>

          <div className="empty-suggestion-chips">
            <button
              type="button"
              className="chip-btn"
              onClick={() => onSelectPrompt('Where does a used pizza box go?')}
            >
              🍕 Used pizza box
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() => onSelectPrompt('How do I safely dispose of old batteries?')}
            >
              🔋 Old batteries
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() => onSelectPrompt('Can I put plastic bags in curbside recycling?')}
            >
              🛍️ Plastic bags
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
