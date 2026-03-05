'use client';

import { ErrorState } from '../../../shared/ui/ErrorState';

export default function DocumentsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="Unable to load documents"
      message="We couldn't load your documents. Please try again."
      onRetry={reset}
    />
  );
}
