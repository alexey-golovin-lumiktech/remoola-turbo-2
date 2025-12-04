'use client';

import { Suspense } from 'react';

import Verification from './Verification';

export default function VerificationPage() {
  return (
    <Suspense fallback={<p>Loading verification page...</p>}>
      <Verification />
    </Suspense>
  );
}
