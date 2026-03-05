import { Suspense } from 'react';

import AuthCallback from './AuthCallback';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<p className="p-4 text-neutral-600">Loading auth callback...</p>}>
      <AuthCallback />
    </Suspense>
  );
}
