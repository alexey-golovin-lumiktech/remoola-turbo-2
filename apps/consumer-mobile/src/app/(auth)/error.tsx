'use client';

import styles from './error.module.css';

export default function AuthError({ reset }: { reset: () => void }) {
  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>Authentication error</h2>
      <button type="button" onClick={reset} className={styles.button}>
        Try again
      </button>
    </div>
  );
}
