import { type Metadata } from 'next';
import { Suspense } from 'react';

import { PaymentMethodsPageClient } from '../../../components/payment-methods/PaymentMethodsPageClient';
import styles from '../../../components/ui/classNames.module.css';
import { SectionErrorBoundary } from '../../../components/ui/ErrorBoundary';

const { pageContainer, pageSubtitle, pageTitle } = styles;

export const metadata: Metadata = {
  title: `Payment Methods - Remoola`,
};

export default async function PaymentMethodsPage() {
  return (
    <div className={pageContainer} data-testid="consumer-payment-methods-page">
      <h1 className={pageTitle}>Bank Accounts & Cards</h1>
      <p className={pageSubtitle}>Manage your saved cards and bank accounts.</p>

      <Suspense fallback={<p role="status">Loading payment methods...</p>}>
        <SectionErrorBoundary>
          <PaymentMethodsPageClient />
        </SectionErrorBoundary>
      </Suspense>
    </div>
  );
}
