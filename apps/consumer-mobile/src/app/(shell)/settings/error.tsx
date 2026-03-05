'use client';

import { ErrorState } from '../../../shared/ui/ErrorState';

export default function SettingsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="Unable to load settings"
      message="We couldn't load your settings. Please try again."
      onRetry={reset}
    />
  );
}
