'use client';

import { useEffect } from 'react';

import { ErrorBoundaryUI } from '../../shared/ui/ErrorBoundaryUI';

type ShellErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ShellError({ error, reset }: ShellErrorProps) {
  useEffect(() => {
    console.error(`[ShellError]`, error.message, error);
  }, [error]);

  return (
    <ErrorBoundaryUI
      onReset={reset}
      navigateTo="/dashboard"
      navigateLabel="Go to Dashboard"
      description="An unexpected error occurred. Please try again or return to the dashboard."
      minHeight="min-h-[60vh]"
    />
  );
}
