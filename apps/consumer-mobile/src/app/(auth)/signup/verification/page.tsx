import { Suspense } from 'react';

import { VerificationView } from '../../../../features/signup/VerificationView';

export default function SignupVerificationPage() {
  return (
    <Suspense fallback={<p className={`p-4 text-neutral-600`}>Loading verification...</p>}>
      <VerificationView />
    </Suspense>
  );
}
