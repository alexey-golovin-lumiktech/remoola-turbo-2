import { type Metadata } from 'next';
import { Suspense } from 'react';

import { StartPaymentForm } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';

const { pageStackContainer, pageSubtitlePlain, pageTitlePlain, startPaymentCard } = styles;

export const metadata: Metadata = {
  title: `Start Payment – Remoola`,
};

export default function StartPaymentPage() {
  return (
    <div className={pageStackContainer}>
      <h1 className={pageTitlePlain}>Start Payment</h1>
      <p className={pageSubtitlePlain}>Send a quick one-off payment to a contractor or client.</p>

      <div className={startPaymentCard}>
        <Suspense fallback={<p aria-hidden>Loading…</p>}>
          <StartPaymentForm />
        </Suspense>
      </div>
    </div>
  );
}
