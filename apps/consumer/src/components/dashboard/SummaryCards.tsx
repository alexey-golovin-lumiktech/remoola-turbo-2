'use client';

import { CURRENCY_CODE, type TCurrencyCode } from '@remoola/api-types';

import { type IDashboardSummary } from '../../types';
import styles from '../ui/classNames.module.css';

const {
  cardBaseSoft,
  summaryCardLabel,
  summaryGrid,
  summaryValueLg,
  summaryValueMd,
  summaryValueMeta,
  summaryValueSm,
} = styles;

function formatMoney(cents: number, currency: TCurrencyCode = CURRENCY_CODE.USD): string {
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
    <section className={summaryGrid} data-testid="consumer-dashboard-summary-cards">
      <div className={cardBaseSoft} data-testid="consumer-dashboard-summary-balance">
        <p className={summaryCardLabel}>Balance</p>
        <p className={summaryValueLg}>{formatMoney(summary.balanceCents)}</p>
      </div>

      <div className={cardBaseSoft} data-testid="consumer-dashboard-summary-contracts">
        <p className={summaryCardLabel}>Contracts</p>
        <p className={summaryValueMd}>
          {summary.activeRequests}
          {` `}
          <span className={summaryValueMeta}>active</span>
        </p>
      </div>

      <div className={cardBaseSoft} data-testid="consumer-dashboard-summary-last-payment">
        <p className={summaryCardLabel}>Last payment</p>
        <p className={summaryValueSm}>{lastPaymentLabel}</p>
      </div>
    </section>
  );
}
