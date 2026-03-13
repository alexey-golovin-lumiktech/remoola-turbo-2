import { type ReactNode } from 'react';

import styles from './ErrorState.module.css';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';

interface ErrorStateProps {
  title?: string;
  message?: string;
  icon?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  showRetry?: boolean;
}

/**
 * ErrorState - Reusable error display component with retry functionality
 * Used in error.tsx boundaries across the app
 * Mobile-first: 44px touch targets, clear messaging, dark mode support
 */
export function ErrorState({
  title = `Something went wrong`,
  message = `We encountered an error. Please try again.`,
  icon,
  onRetry,
  retryLabel = `Try again`,
  showRetry = true,
}: ErrorStateProps) {
  return (
    <div className={styles.root}>
      <div className={styles.inner}>
        <div className={styles.iconWrap}>
          {icon ?? <AlertTriangleIcon className={styles.icon} strokeWidth={2} aria-hidden="true" />}
        </div>

        <h2 className={styles.title}>{title}</h2>

        <p className={styles.message}>{message}</p>

        {showRetry && onRetry ? (
          <button type="button" onClick={onRetry} className={styles.retryButton}>
            {retryLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
