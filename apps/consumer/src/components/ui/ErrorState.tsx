'use client';

import styles from './classNames.module.css';

const {
  emptyStateContainer,
  emptyStateIcon,
  emptyStateIconSvg,
  errorBoundaryText,
  errorBoundaryTitle,
  refreshButtonClass,
  textCenter,
} = styles;

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showRefreshButton?: boolean;
}

export function ErrorState({
  title = `Something went wrong`,
  message,
  onRetry,
  showRefreshButton = true,
}: ErrorStateProps) {
  const handleRefresh = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className={emptyStateContainer}>
      <div className={textCenter}>
        <div className={emptyStateIcon}>
          <svg className={emptyStateIconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732
              0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h2 className={errorBoundaryTitle}>{title}</h2>
        {message && <p className={errorBoundaryText}>{message}</p>}
        {showRefreshButton && (
          <button
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
