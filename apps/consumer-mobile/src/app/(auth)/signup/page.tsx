import { Suspense } from 'react';

import { SignupFlowView } from '../../../features/signup/SignupFlowView';

export default function SignupPage() {
  return (
    <Suspense fallback={<p className="p-4 text-neutral-600">Loading...</p>}>
      <SignupFlowView />
    </Suspense>
  );
}
