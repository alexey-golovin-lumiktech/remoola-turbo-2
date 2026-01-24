'use client';

import { type IDashboardSummary } from '../../types';
import styles from '../ui/classNames.module.css';

const { cardBaseSoft, summaryCardLabel, summaryGrid, summaryValueLg, summaryValueMd, summaryValueMeta, summaryValueSm } =
  styles;

function formatMoney(cents: number, currency = `USD`) {
  return new Intl.NumberFormat(undefined, {
    style: `currency`,
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

type SummaryCardsProps = { summary: IDashboardSummary };

export function SummaryCards({ summary }: SummaryCardsProps) {
  const lastPaymentLabel = summary.lastPaymentAt
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: `medium`,
        timeStyle: `short`,
      }).format(new Date(summary.lastPaymentAt))
    : `—`;

  return (
    <section className={summaryGrid}>
      <div className={cardBaseSoft}>
        <p className={summaryCardLabel}>Balance</p>
        <p className={summaryValueLg}>{formatMoney(summary.balanceCents)}</p>
      </div>

      <div className={cardBaseSoft}>
        <p className={summaryCardLabel}>Contracts</p>
        <p className={summaryValueMd}>
          {summary.activeRequests}
          {` `}
          <span className={summaryValueMeta}>active</span>
        </p>
      </div>

      <div className={cardBaseSoft}>
        <p className={summaryCardLabel}>Last payment</p>
        <p className={summaryValueSm}>{lastPaymentLabel}</p>
      </div>
    </section>
  );
}
