'use client';

import { useEffect } from 'react';

import styles from './error.module.css';

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log to error reporting in production; correlation id can be error.digest
  }, [error]);

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>Something went wrong</h2>
      <p className={styles.message}>We encountered an unexpected error. You can try again.</p>
      <button type="button" onClick={reset} className={styles.button}>
        Try again
      </button>
    </div>
  );
}
