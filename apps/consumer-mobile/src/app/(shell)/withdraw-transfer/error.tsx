'use client';

import { ErrorState } from '../../../shared/ui/ErrorState';

export default function WithdrawTransferError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="Unable to load withdraw/transfer"
      message="We couldn't load the withdraw and transfer interface. Please try again."
      onRetry={reset}
    />
  );
}
