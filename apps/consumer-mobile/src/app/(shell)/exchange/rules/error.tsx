'use client';

import { useEffect } from 'react';

import { ErrorState } from '../../../../shared/ui/ErrorState';

export default function ExchangeRulesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {}, [error]);

  return (
    <div
      className="
        mx-auto
        max-w-md
        p-4
      "
    >
      <ErrorState
        title="Failed to load rules"
        message="We couldn't load your exchange rules. Please try again."
        onRetry={reset}
      />
    </div>
  );
}
