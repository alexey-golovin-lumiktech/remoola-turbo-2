'use client';

import { useEffect } from 'react';

import { ErrorState } from '../shared/ui/ErrorState';

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log to error reporting in production; correlation id can be error.digest
  }, [error]);

  return (
    <ErrorState
      title="Something went wrong"
      message="We encountered an unexpected error. You can try again."
      onRetry={reset}
    />
  );
}
