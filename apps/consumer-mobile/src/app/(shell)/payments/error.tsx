'use client';

import { ErrorState } from '../../../shared/ui/ErrorState';

export default function PaymentsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="Unable to load payments"
      message="We couldn't load your payment history. Please try again."
      onRetry={reset}
    />
  );
}
