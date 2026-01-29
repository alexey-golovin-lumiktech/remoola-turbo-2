'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';

import styles from './ui/classNames.module.css';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to error reporting service in production
    console.error(`Error caught by boundary:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, () => {
          this.setState({ hasError: false, error: null });
        });
      }

      return (
        <div className={styles.adminErrorBoundaryContainer}>
          <div className={styles.adminErrorBoundaryCard}>
            <div className={styles.adminErrorBoundaryIcon}>⚠️</div>
            <h2 className={styles.adminErrorBoundaryTitle}>Something went wrong</h2>
            <p className={styles.adminErrorBoundaryMessage}>
              {this.state.error.message || `An unexpected error occurred`}
            </p>
            <button
              onClick={(e) => (
                e.stopPropagation(),
                e.preventDefault(),
                this.setState({ hasError: false, error: null })
              )}
              className={styles.adminErrorBoundaryButton}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook-based error boundary for functional components
export function ErrorFallback({ error, retryAction }: { error: Error; retryAction: () => void }) {
  return (
    <div className={styles.adminErrorFallbackContainer}>
      <div className={styles.adminErrorFallbackCard}>
        <div className={styles.adminErrorFallbackIcon}>⚠️</div>
        <p className={styles.adminErrorFallbackMessage}>{error.message || `Something went wrong`}</p>
        <button onClick={retryAction} className={styles.adminErrorFallbackButton}>
          Retry
        </button>
      </div>
    </div>
  );
}
