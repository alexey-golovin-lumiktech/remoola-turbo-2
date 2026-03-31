'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import styles from './DashboardView.module.css';

export function DashboardRetryButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={styles.retryLink}
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      data-testid="dashboard-error-retry"
    >
      {isPending ? `Retrying...` : `Try again`}
    </button>
  );
}
