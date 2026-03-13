'use client';

import { useEffect } from 'react';

import styles from './error.module.css';
import { clientLogger } from '../../../lib/logger';
import { ErrorState } from '../../../shared/ui/ErrorState';

interface PaymentMethodsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PaymentMethodsError({ error, reset }: PaymentMethodsErrorProps) {
  useEffect(() => {
    clientLogger.error(`Payment methods error`, { error: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className={styles.wrapper}>
      <ErrorState
        title="Failed to load payment methods"
        message="We couldn't load your payment methods. Please try again."
        onRetry={reset}
      />
    </div>
  );
}
