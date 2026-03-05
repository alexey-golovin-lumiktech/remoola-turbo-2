'use client';

import { ErrorState } from '../../shared/ui/ErrorState';

export default function ShellError({ reset }: { reset: () => void }) {
  return <ErrorState onRetry={reset} />;
}
