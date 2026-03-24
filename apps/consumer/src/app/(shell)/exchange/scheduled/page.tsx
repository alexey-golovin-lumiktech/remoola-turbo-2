import { type Metadata } from 'next';
import { Suspense } from 'react';

import { ScheduledConversionsPageClient } from '../../../../components/exchange/ScheduledConversionsPageClient';
import styles from '../../../../components/ui/classNames.module.css';

const { pageContainer, pageSubtitle, pageTitle } = styles;

export const metadata: Metadata = {
  title: `Scheduled Conversions - Remoola`,
};

export default function ScheduledConversionsPage() {
  return (
    <div className={pageContainer} data-testid="consumer-scheduled-conversions-page">
      <h1 className={pageTitle}>Scheduled Conversions</h1>
      <p className={pageSubtitle}>Plan currency conversions ahead of time and track their status.</p>

      <Suspense fallback={<p aria-hidden>Loading scheduled conversions…</p>}>
        <ScheduledConversionsPageClient />
      </Suspense>
    </div>
  );
}
