'use client';

import React from 'react';
import { Sparkles, RotateCcw } from 'lucide-react';

interface ChatHeaderProps {
  onReset: () => void;
  hasMessages: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onReset,
  hasMessages,
}) => {
  return (
    <header className="chatbox-header">
      <div className="brand">
        <div className="brand-icon-wrapper" aria-hidden="true">
          <Sparkles size={16} />
        </div>
        <div className="brand-title">
          <span>Dakshan AI</span>
          <span className="status-dot" title="Powered by Google Gemini" />
        </div>
      </div>

      {hasMessages && (
        <button
          type="button"
          className="btn-icon"
          onClick={onReset}
          title="Start a new chat"
          aria-label="Start a new chat"
        >
          <RotateCcw size={13} />
          <span>New Chat</span>
        </button>
      )}
    </header>
  );
};
