'use client';

import React from 'react';
import { X, Server, Terminal, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { ServerHealthStatus } from '@/lib/types';

interface ServerStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  health: ServerHealthStatus | null;
}

export const ServerStatusModal: React.FC<ServerStatusModalProps> = ({
  isOpen,
  onClose,
  health,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Server size={18} color="#10b981" />
            <span>GGUF Model Backend Connection</span>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p>
            This application connects to any local inference engine serving your <strong>GGUF</strong> model
            via an OpenAI-compatible endpoint.
          </p>

          <div
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Configured Endpoint:</span>
              <strong style={{ color: '#38bdf8' }}>{health?.providerUrl || 'http://127.0.0.1:8080/v1'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Target Model:</span>
              <strong>{health?.model || 'default'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Status:</span>
              {health?.status === 'connected' ? (
                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={13} /> Connected ({health.latencyMs}ms)
                </span>
              ) : health?.status === 'mock_mode' ? (
                <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={13} /> Local Awareness Fallback (Server Offline)
                </span>
              ) : (
                <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={13} /> Offline
                </span>
              )}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.35rem' }}>
              <Terminal size={14} color="#10b981" />
              <strong style={{ fontSize: '0.82rem' }}>Option A: Run with llama.cpp server</strong>
            </div>
            <div className="code-box">
              llama-server -m path/to/your_model.gguf --port 8080 -c 4096
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.35rem' }}>
              <Terminal size={14} color="#10b981" />
              <strong style={{ fontSize: '0.82rem' }}>Option B: Run with Ollama</strong>
            </div>
            <div className="code-box">
              ollama run mistral
              <br />
              <span style={{ color: 'var(--text-muted)' }}># then set LLM_BASE_URL=http://127.0.0.1:11434/v1 in .env.local</span>
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            All connection details are managed via <code>.env.local</code>. No model paths or URLs are hardcoded in the client.
          </div>
        </div>
      </div>
    </div>
  );
};
