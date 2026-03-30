import { Suspense } from 'react';

import AuthCallback from './AuthCallback';
import styles from './page.module.css';

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <p className={styles.fallback} role="status" aria-live="polite">
          Loading auth callback...
        </p>
      }
    >
      <AuthCallback />
    </Suspense>
  );
}
