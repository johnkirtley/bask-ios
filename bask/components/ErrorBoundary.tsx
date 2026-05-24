'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch React errors and prevent white screen crashes
 * Displays a user-friendly error message with retry option
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            padding: '20px',
            textAlign: 'center',
            backgroundColor: '#FFF8F0',
          }}>
          <div
            style={{
              fontSize: '48px',
              marginBottom: '16px',
            }}>
            ☀️
          </div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#1A1A1A',
              marginBottom: '8px',
            }}>
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: '#666',
              marginBottom: '24px',
              maxWidth: '400px',
            }}>
            We encountered an unexpected error. Please try restarting the app.
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              backgroundColor: '#FF6B35',
              color: 'white',
              padding: '12px 32px',
              fontSize: '16px',
              fontWeight: '500',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
            }}>
            Restart App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
