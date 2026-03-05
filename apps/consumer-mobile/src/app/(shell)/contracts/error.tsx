'use client';

import { ErrorState } from '../../../shared/ui/ErrorState';

export default function ContractsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="Unable to load contracts"
      message="We couldn't load your contracts. Please try again."
      onRetry={reset}
    />
  );
}
