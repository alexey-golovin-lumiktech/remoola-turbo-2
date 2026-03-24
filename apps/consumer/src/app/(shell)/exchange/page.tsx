import { type Metadata } from 'next';
import { Suspense } from 'react';

import { ExchangePageClient } from '../../../components/exchange';
import styles from '../../../components/ui/classNames.module.css';

const { pageContainer, pageSubtitle, pageTitle } = styles;

export const metadata: Metadata = {
  title: `Currency Exchange - Remoola`,
};

export default function ExchangePage() {
  return (
    <div className={pageContainer} data-testid="consumer-exchange-page">
      <h1 className={pageTitle}>Currency Exchange</h1>
      <p className={pageSubtitle}>Convert balances and manage your automated exchange workflows.</p>

      <Suspense fallback={<p aria-hidden>Loading exchange…</p>}>
        <ExchangePageClient />
      </Suspense>
    </div>
  );
}
