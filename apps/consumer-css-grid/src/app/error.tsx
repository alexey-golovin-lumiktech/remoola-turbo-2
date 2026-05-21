'use client';

import { useEffect } from 'react';

import { ErrorBoundaryUI } from '../shared/ui/ErrorBoundaryUI';

type RootErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RootError({ error, reset }: RootErrorProps) {
  useEffect(() => {
    console.error(`[RootError]`, error.message, error);
  }, [error]);

  return (
    <ErrorBoundaryUI
      onReset={reset}
      navigateTo="/login"
      navigateLabel="Go to Login"
      description="An unexpected error occurred. Please try again or return to the login screen."
    />
  );
}
