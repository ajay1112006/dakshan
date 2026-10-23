'use client';

import React, { useRef, useEffect } from 'react';
import { Send, Square, AlertCircle, X, RotateCcw } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onStop: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  onDismissError: () => void;
  onRetry?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSubmit,
  onStop,
  isLoading,
  errorMessage,
  onDismissError,
  onRetry,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 140)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <div className="input-area-container">
      {/* Error notification banner */}
      {errorMessage && (
        <div className="error-banner" role="alert">
          <div className="error-banner-content">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {onRetry && (
              <button
                type="button"
                className="btn-icon"
                onClick={onRetry}
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderColor: '#ef4444' }}
              >
                <RotateCcw size={12} />
                <span>Retry</span>
              </button>
            )}
            <button
              type="button"
              className="error-close-btn"
              onClick={onDismissError}
              aria-label="Dismiss error notification"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Input wrapper */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isLoading && input.trim()) onSubmit();
        }}
        className="input-box-wrapper"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Dakshan AI anything (ideas, coding, questions, eco advice)..."
          rows={1}
          className="chat-textarea"
          disabled={isLoading}
          aria-label="Ask Dakshan AI a question"
        />

        <div className="input-actions">
          {isLoading ? (
            <button
              type="button"
              onClick={onStop}
              className="btn-stop"
              title="Stop generating"
              aria-label="Stop generation"
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="btn-send"
              title="Send question"
              aria-label="Send question"
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
