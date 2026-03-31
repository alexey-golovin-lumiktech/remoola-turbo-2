'use client';

import { Suspense } from 'react';

import Verification from './Verification';

export default function VerificationPage() {
  return (
    <Suspense
      fallback={
        <p role="status" aria-live="polite" aria-atomic="true">
          Loading verification status...
        </p>
      }
    >
      <Verification />
    </Suspense>
  );
}
