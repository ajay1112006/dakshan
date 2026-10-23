'use client';

import React from 'react';
import { Sprout, RotateCcw } from 'lucide-react';

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
          <Sprout size={18} />
        </div>
        <div className="brand-title">
          <span>Dakshan AI</span>
          <span className="status-dot" title="Live GGUF Model Connected" />
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
