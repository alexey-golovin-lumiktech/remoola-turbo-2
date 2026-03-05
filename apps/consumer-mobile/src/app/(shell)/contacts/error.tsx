'use client';

import { useEffect } from 'react';

import { clientLogger } from '../../../lib/logger';
import { ErrorState } from '../../../shared/ui/ErrorState';

interface ContactsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ContactsError({ error, reset }: ContactsErrorProps) {
  useEffect(() => {
    clientLogger.error(`Contacts error`, { error: error.message, digest: error.digest });
  }, [error]);

  return (
    <ErrorState
      title="Failed to load contacts"
      message="We couldn't load your contacts. Please try again."
      onRetry={reset}
    />
  );
}
