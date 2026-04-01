'use client';

import { ErrorState } from '../../shared/ui/ErrorState';

export default function AuthError({ reset }: { reset: () => void }) {
  return (
    <ErrorState
      title="Authentication error"
      message="We encountered an unexpected authentication issue. Please try again."
      onRetry={reset}
    />
  );
}
