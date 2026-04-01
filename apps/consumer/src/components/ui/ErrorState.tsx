'use client';

import { AlertIcon } from '@remoola/ui';

import shared from './classNames.module.css';
import localStyles from './ErrorState.module.css';

const {
  emptyStateContainer,
  emptyStateIcon,
  emptyStateIconSvg,
  errorBoundaryText,
  errorBoundaryTitle,
  refreshButtonClass,
} = shared;

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showRefreshButton?: boolean;
  containerTestId?: string;
  retryTestId?: string;
}

export function ErrorState({
  title = `Something went wrong`,
  message,
  onRetry,
  showRefreshButton = true,
  containerTestId = `consumer-error-state`,
  retryTestId = `consumer-error-state-retry`,
}: ErrorStateProps) {
  const handleRefresh = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className={emptyStateContainer} data-testid={containerTestId}>
      <div className={localStyles.inner}>
        <div className={emptyStateIcon}>
          <AlertIcon className={emptyStateIconSvg} aria-hidden="true" />
        </div>
        <h2 className={errorBoundaryTitle}>{title}</h2>
        {message && <p className={errorBoundaryText}>{message}</p>}
        {showRefreshButton && (
          <button
            type="button"
            data-testid={retryTestId}
            onClick={(e) => (e.preventDefault(), e.stopPropagation(), handleRefresh())}
            className={refreshButtonClass}
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
