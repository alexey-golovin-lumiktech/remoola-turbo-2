import { Suspense } from 'react';

import styles from './page.module.css';
import { ContractorKindView } from '../../../../../features/signup/ContractorKindView';

export default function SignupContractorKindPage() {
  return (
    <Suspense fallback={<p className={styles.fallback}>Loading...</p>}>
      <ContractorKindView />
    </Suspense>
  );
}
