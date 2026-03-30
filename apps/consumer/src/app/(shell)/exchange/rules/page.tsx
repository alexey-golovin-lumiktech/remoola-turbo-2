import { type Metadata } from 'next';
import { Suspense } from 'react';

import { ExchangeRulesPageClient } from '../../../../components/exchange/ExchangeRulesPageClient';
import styles from '../../../../components/ui/classNames.module.css';

const { pageContainer, pageSubtitle, pageTitle } = styles;

export const metadata: Metadata = {
  title: `Exchange Rules - Remoola`,
};

export default function ExchangeRulesPage() {
  return (
    <div className={pageContainer} data-testid="consumer-exchange-rules-page">
      <h1 className={pageTitle}>Auto-Conversion Rules</h1>
      <p className={pageSubtitle}>Manage automated balance conversion rules.</p>

      <Suspense fallback={<p role="status">Loading exchange rules…</p>}>
        <ExchangeRulesPageClient />
      </Suspense>
    </div>
  );
}
