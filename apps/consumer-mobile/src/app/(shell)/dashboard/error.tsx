'use client';

import { ErrorState } from '../../../shared/ui/ErrorState';

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="Unable to load dashboard"
      message="We couldn't load your dashboard. Please try again."
      onRetry={reset}
    />
  );
}
