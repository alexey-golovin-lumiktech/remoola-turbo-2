'use client';

import { useEffect } from 'react';

import { ErrorState } from '../components/ui/ErrorState';
import { clientLogger } from '../lib/logger';

/**
 * Root-level error UI. Replaces the root layout when triggered.
 * Must define its own <html> and <body> (Next.js requirement).
 * Defining this file also avoids Turbopack chunk load failures for the built-in global-error.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    clientLogger.error(`Global error boundary triggered`, {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <ErrorState
          title="Something went wrong"
          message="An unexpected error occurred. Please try again."
          onRetry={reset}
          retryTestId="consumer-global-error-retry"
        />
      </body>
    </html>
  );
}
