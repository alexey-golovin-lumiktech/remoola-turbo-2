import { Suspense } from 'react';

import { VerificationView } from '../../../../features/signup/VerificationView';

export default function SignupVerificationPage() {
  return (
    <Suspense
      fallback={
        <p className={`p-4 text-neutral-600`} role="status" aria-live="polite">
          Loading verification...
        </p>
      }
    >
      <VerificationView />
    </Suspense>
  );
}
