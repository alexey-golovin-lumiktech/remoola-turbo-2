'use client';

import { useEffect } from 'react';

import { ErrorState } from '../components/ui/ErrorState';
import { clientLogger } from '../lib/logger';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    clientLogger.error(`App error boundary triggered`, {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <ErrorState
      title="Something went wrong"
      message="We hit an unexpected issue while loading this page. Please try again."
      onRetry={reset}
      containerTestId="consumer-app-error"
      retryTestId="consumer-app-error-retry"
    />
  );
}
