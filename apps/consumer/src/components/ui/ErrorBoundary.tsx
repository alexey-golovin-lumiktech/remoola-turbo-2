'use client';

import React, { Component, type ReactNode } from 'react';

import { AlertIcon } from '@remoola/ui';

import shared from './classNames.module.css';
import localStyles from './ErrorBoundary.module.css';
import { clientLogger } from '../../lib/logger';

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
} = shared;

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
    clientLogger.error(`Error caught by boundary`, {
      message: error.message,
      componentStack: errorInfo.componentStack ?? undefined,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={errorBoundaryContainer}>
          <div className={emptyStateIcon}>
            <AlertIcon className={emptyStateIconSvg} aria-hidden="true" />
          </div>
          <h2 className={errorBoundaryTitle}>Something went wrong</h2>
          <p className={errorBoundaryText}>
            We encountered an unexpected error. Please try refreshing the page or contact support if the problem
            persists.
          </p>
          <div className={errorBoundaryButtons}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.reload();
              }}
              className={refreshButtonClass}
            >
              Refresh Page
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                this.setState({ hasError: false, error: undefined });
              }}
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
          <div className={localStyles.sectionInner}>
            <AlertIcon className={sectionErrorIcon} aria-hidden="true" />
            <p className={sectionErrorText}>This section encountered an error</p>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
