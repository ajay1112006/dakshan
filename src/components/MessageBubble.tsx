'use client';

import React, { useState } from 'react';
import { Bot, User, Copy, Check, Recycle, Sprout, Trash2, AlertTriangle, Cpu } from 'lucide-react';
import { ChatMessage } from '@/lib/types';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isStreaming = false }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write failure
    }
  };

  // Helper to detect prominent waste category in bot answers for category pill
  const detectCategory = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes('category: hazardous') || lower.includes('hazardous waste')) {
      return { label: 'Hazardous Waste', icon: <AlertTriangle size={12} />, className: 'hazardous' };
    }
    if (lower.includes('category: compost') || lower.includes('compost / organic') || lower.includes('organics bin')) {
      return { label: 'Compost / Organics', icon: <Sprout size={12} />, className: 'compost' };
    }
    if (lower.includes('category: recycling') || lower.includes('recycling bin') || lower.includes('blue bin')) {
      return { label: 'Recycling', icon: <Recycle size={12} />, className: 'recycle' };
    }
    if (lower.includes('category: e-waste') || lower.includes('electronic waste')) {
      return { label: 'E-Waste', icon: <Cpu size={12} />, className: 'ewaste' };
    }
    if (lower.includes('category: landfill') || lower.includes('category: general landfill') || lower.includes('trash bin')) {
      return { label: 'Landfill / Trash', icon: <Trash2 size={12} />, className: 'landfill' };
    }
    return null;
  };

  const detectedCategory = !isUser ? detectCategory(message.content) : null;

  // Simple, resilient markdown-like formatter
  const renderFormattedContent = (content: string) => {
    if (isUser) {
      return <p>{content}</p>;
    }

    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];
    let isOrdered = false;

    const flushList = () => {
      if (listItems.length > 0) {
        if (isOrdered) {
          elements.push(
            <ol key={`ol-${elements.length}`}>
              {listItems.map((item, idx) => (
                <li key={idx}>{parseInlineStyles(item)}</li>
              ))}
            </ol>
          );
        } else {
          elements.push(
            <ul key={`ul-${elements.length}`}>
              {listItems.map((item, idx) => (
                <li key={idx}>{parseInlineStyles(item)}</li>
              ))}
            </ul>
          );
        }
        listItems = [];
        isOrdered = false;
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Headings (### , ## , # )
      const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)/);
      if (headingMatch) {
        flushList();
        const level = headingMatch[1].length;
        const headingText = headingMatch[2];
        if (level === 1) {
          elements.push(<h3 key={`h-${index}`} className="bubble-h1">{parseInlineStyles(headingText)}</h3>);
        } else if (level === 2) {
          elements.push(<h4 key={`h-${index}`} className="bubble-h2">{parseInlineStyles(headingText)}</h4>);
        } else {
          elements.push(<h5 key={`h-${index}`} className="bubble-h3">{parseInlineStyles(headingText)}</h5>);
        }
        return;
      }

      // Blockquotes
      if (trimmed.startsWith('>')) {
        flushList();
        const quoteText = trimmed.replace(/^>\s*/, '');
        elements.push(
          <blockquote key={`quote-${index}`}>
            {parseInlineStyles(quoteText)}
          </blockquote>
        );
        return;
      }

      // Ordered list (1. , 2. )
      const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (orderedMatch) {
        if (listItems.length > 0 && !isOrdered) flushList();
        isOrdered = true;
        listItems.push(orderedMatch[2]);
        return;
      }

      // Unordered list (- , * )
      const unorderedMatch = trimmed.match(/^[-*]\s+(.*)/);
      if (unorderedMatch) {
        if (listItems.length > 0 && isOrdered) flushList();
        isOrdered = false;
        listItems.push(unorderedMatch[1]);
        return;
      }

      // Regular paragraph or blank line
      flushList();
      if (trimmed.length > 0) {
        elements.push(
          <p key={`p-${index}`}>
            {parseInlineStyles(trimmed)}
          </p>
        );
      }
    });

    flushList();

    return elements;
  };

  // Parses inline bolding (**bold**), code (`code`), and italics (*italics*)
  const parseInlineStyles = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    // Regex splits by **bold**, `code`, and *italic*
    const tokenRegex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
    const tokens = text.split(tokenRegex);

    tokens.forEach((token, idx) => {
      if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
        parts.push(<strong key={idx}>{token.slice(2, -2)}</strong>);
      } else if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
        parts.push(<code key={idx}>{token.slice(1, -1)}</code>);
      } else if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
        parts.push(<em key={idx}>{token.slice(1, -1)}</em>);
      } else if (token.length > 0) {
        parts.push(token);
      }
    });

    return parts;
  };

  return (
    <div className={`message-row ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && (
        <div className="avatar bot-avatar" title="Dakshan AI" aria-hidden="true">
          <Bot size={18} />
        </div>
      )}

      <div className="bubble">
        {detectedCategory && (
          <div style={{ marginBottom: '0.45rem' }}>
            <span className={`cat-pill ${detectedCategory.className}`}>
              {detectedCategory.icon}
              {detectedCategory.label}
            </span>
          </div>
        )}

        <div className="bubble-content">
          {renderFormattedContent(message.content)}
          {isStreaming && <span className="cursor-blink" aria-hidden="true" />}
        </div>

        {!isUser && !isStreaming && message.content.length > 0 && (
          <div className="bubble-footer">
            <span>Dakshan AI</span>
            <button
              type="button"
              className="copy-btn"
              onClick={handleCopy}
              aria-label="Copy response to clipboard"
            >
              {copied ? (
                <>
                  <Check size={12} color="#10b981" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {isUser && (
        <div className="avatar user-avatar" title="You" aria-hidden="true">
          <User size={18} />
        </div>
      )}
    </div>
  );
};
