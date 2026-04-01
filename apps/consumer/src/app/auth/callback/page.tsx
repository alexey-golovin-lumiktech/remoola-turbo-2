'use client';

import { Suspense } from 'react';

import AuthCallback from './AuthCallback';

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <p role="status" aria-live="polite" aria-atomic="true">
          Loading sign-in status...
        </p>
      }
    >
      <AuthCallback />
    </Suspense>
  );
}
