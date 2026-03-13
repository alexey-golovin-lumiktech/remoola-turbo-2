'use client';

import { useEffect } from 'react';

import styles from './error.module.css';
import { ErrorState } from '../../../../shared/ui/ErrorState';

export default function ExchangeScheduledError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {}, [error]);

  return (
    <div className={styles.wrapper}>
      <ErrorState
        title="Failed to load scheduled conversions"
        message="We couldn't load your scheduled conversions. Please try again."
        onRetry={reset}
      />
    </div>
  );
}
