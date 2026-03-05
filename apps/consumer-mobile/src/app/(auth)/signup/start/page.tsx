import { Suspense } from 'react';

import { SignupStartView } from '../../../../features/signup/SignupStartView';

export default function SignupStartPage() {
  return (
    <Suspense fallback={<p className="p-4 text-neutral-600">Loading...</p>}>
      <SignupStartView />
    </Suspense>
  );
}
