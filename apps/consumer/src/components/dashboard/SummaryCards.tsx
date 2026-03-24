'use client';

import { CURRENCY_CODE } from '@remoola/api-types';
import { ClockIcon, DocumentTextIcon, WalletIcon } from '@remoola/ui';

import localStyles from './SummaryCards.module.css';
import { formatCentsToDisplay } from '../../lib/currency';
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
        <div className={localStyles.cardHeaderRow}>
          <p className={summaryCardLabel}>Balance</p>
          <span className={localStyles.iconBlue}>
            <WalletIcon size={18} strokeWidth={1.75} aria-hidden="true" />
          </span>
        </div>
        <p className={summaryValueLg}>{formatCentsToDisplay(summary.balanceCents, CURRENCY_CODE.USD)}</p>
      </div>

      <div className={cardBaseSoft} data-testid="consumer-dashboard-summary-open-requests">
        <div className={localStyles.cardHeaderRow}>
          <p className={summaryCardLabel}>Open requests</p>
          <span className={localStyles.iconViolet}>
            <DocumentTextIcon size={18} strokeWidth={1.75} aria-hidden="true" />
          </span>
        </div>
        <p className={summaryValueMd}>
          {summary.activeRequests}
          {` `}
          <span className={summaryValueMeta}>active</span>
        </p>
      </div>

      <div className={cardBaseSoft} data-testid="consumer-dashboard-summary-last-payment">
        <div className={localStyles.cardHeaderRow}>
          <p className={summaryCardLabel}>Last payment</p>
          <span className={localStyles.iconEmerald}>
            <ClockIcon size={18} strokeWidth={1.75} aria-hidden="true" />
          </span>
        </div>
        <p className={summaryValueSm}>{lastPaymentLabel}</p>
      </div>
    </section>
  );
}
