import { Suspense } from 'react';

import { SignupStartView } from '../../../../features/signup/SignupStartView';

export default function SignupStartPage() {
  return (
    <Suspense
      fallback={
        <p className={`p-4 text-neutral-600`} role="status" aria-live="polite">
          Loading...
        </p>
      }
    >
      <SignupStartView />
    </Suspense>
  );
}
