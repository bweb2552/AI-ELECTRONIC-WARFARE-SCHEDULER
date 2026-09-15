import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  panelName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary] ${this.props.panelName || 'Panel'} crashed:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="glass-panel" style={{
          padding: '16px',
          border: '1px solid rgba(255, 80, 80, 0.3)',
          background: 'rgba(255, 80, 80, 0.05)',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#ff5050' }}>
            <strong>Panel Error: {this.props.panelName || 'Unknown'}</strong>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', marginTop: '8px' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: '8px',
              padding: '4px 12px',
              background: 'rgba(255, 80, 80, 0.2)',
              border: '1px solid rgba(255, 80, 80, 0.3)',
              color: '#ff5050',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
