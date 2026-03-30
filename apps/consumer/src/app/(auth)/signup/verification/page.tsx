'use client';

import { Suspense } from 'react';

import Verification from './Verification';

export default function VerificationPage() {
  return (
    <Suspense
      fallback={
        <p role="status" aria-live="polite">
          Loading verification page...
        </p>
      }
    >
      <Verification />
    </Suspense>
  );
}
