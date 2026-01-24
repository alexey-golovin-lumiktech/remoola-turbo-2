'use client';

import React, { Component, type ReactNode } from 'react';

import styles from './classNames.module.css';

const {
  emptyStateIcon,
  emptyStateIconSvg,
  errorBoundaryButtons,
  errorBoundaryContainer,
  errorBoundaryRetryButton,
  errorBoundaryText,
  errorBoundaryTitle,
  errorDetails,
  errorDetailsPre,
  errorDetailsSummary,
  refreshButtonClass,
  sectionErrorFallback,
  sectionErrorIcon,
  sectionErrorText,
  textCenter,
} = styles;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to monitoring service
    console.error(`Error caught by boundary:`, error, errorInfo);

    // In production, you might want to send this to an error reporting service
    // like Sentry, LogRocket, or similar
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={errorBoundaryContainer}>
          <div className={emptyStateIcon}>
            <svg className={emptyStateIconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667
                1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className={errorBoundaryTitle}>Something went wrong</h2>
          <p className={errorBoundaryText}>
            We encountered an unexpected error. Please try refreshing the page or contact support if the problem
            persists.
          </p>
          <div className={errorBoundaryButtons}>
            <button onClick={() => window.location.reload()} className={refreshButtonClass}>
              Refresh Page
            </button>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className={errorBoundaryRetryButton}
            >
              Try Again
            </button>
          </div>
          {process.env.NODE_ENV === `development` && this.state.error && (
            <details className={errorDetails}>
              <summary className={errorDetailsSummary}>Error Details (Development)</summary>
              <pre className={errorDetailsPre}>{this.state.error.stack}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Convenience component for page-level error boundaries
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

// Convenience component for section-level error boundaries with simpler fallback
export function SectionErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className={sectionErrorFallback}>
          <div className={textCenter}>
            <svg className={sectionErrorIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667
                1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <p className={sectionErrorText}>This section encountered an error</p>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
