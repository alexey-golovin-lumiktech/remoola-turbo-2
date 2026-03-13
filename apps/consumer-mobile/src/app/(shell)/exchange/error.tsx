'use client';

import { useEffect } from 'react';

import styles from './error.module.css';
import { ErrorState } from '../../../shared/ui/ErrorState';

export default function ExchangeError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {}, [error]);

  return (
    <div className={styles.wrapper}>
      <ErrorState
        title="Failed to load exchange"
        message="We couldn't load the exchange page. Please try again."
        onRetry={reset}
      />
    </div>
  );
}
