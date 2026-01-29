'use client';

import { Suspense } from 'react';

import AuthCallback from './AuthCallback';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<p>Loading auth callback...</p>}>
      <AuthCallback />
    </Suspense>
  );
}
