import { type Metadata } from 'next';
import { Suspense } from 'react';

import styles from '../../../components/ui/classNames.module.css';
import { WithdrawTransferPageClient } from '../../../components/withdraw-transfer';

const { pageContainer, pageSubtitle, pageTitle } = styles;

export const metadata: Metadata = {
  title: `Withdraw and Transfer - Remoola`,
};

export default function WithdrawTransferPage() {
  return (
    <div className={pageContainer} data-testid="consumer-withdraw-transfer-page">
      <h1 className={pageTitle}>Withdraw and Transfer</h1>
      <p className={pageSubtitle}>Move funds between balances or withdraw them to a saved destination.</p>

      <Suspense fallback={<p role="status">Loading withdraw and transfer…</p>}>
        <WithdrawTransferPageClient />
      </Suspense>
    </div>
  );
}
