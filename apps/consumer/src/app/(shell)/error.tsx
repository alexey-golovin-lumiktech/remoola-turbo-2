'use client';

import { useEffect } from 'react';

import { ErrorState } from '../../components/ui/ErrorState';
import { clientLogger } from '../../lib/logger';

export default function ShellError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    clientLogger.error(`Shell error boundary triggered`, {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <ErrorState
      title="This section is unavailable"
      message="We hit an unexpected issue in this part of the app. Please retry without leaving the current session."
      onRetry={reset}
      containerTestId="consumer-shell-error"
      retryTestId="consumer-shell-error-retry"
    />
  );
}
