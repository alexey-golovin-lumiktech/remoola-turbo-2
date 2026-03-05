import { Suspense } from 'react';

import { ContractorKindView } from '../../../../../features/signup/ContractorKindView';

export default function SignupContractorKindPage() {
  return (
    <Suspense fallback={<p className="p-4 text-neutral-600">Loading...</p>}>
      <ContractorKindView />
    </Suspense>
  );
}
