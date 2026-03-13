'use client';

import styles from './BalanceCard.module.css';
import { IconBadge } from './IconBadge';
import { formatBalanceCurrency } from '../utils/date-format';
import { CurrencyDollarIcon } from './icons/CurrencyDollarIcon';

export interface BalanceCardProps {
  /** Balance amount in minor units (cents) */
  amountCents: number;
  /** ISO currency code (e.g. USD, EUR) */
  currencyCode: string;
  /** Card label; defaults to currency code */
  label?: string;
  /** Subtitle under the amount; defaults to "Available balance" */
  subtitle?: string;
  /** Optional animation delay (ms) for staggered lists */
  animationDelay?: number;
  /** Optional data-testid for the amount element */
  testId?: string;
}

/**
 * Shared balance card for Dashboard and Payments.
 * Uses tabular numbers, color semantics (positive / zero / negative), and consistent formatting.
 */
export function BalanceCard({
  amountCents,
  currencyCode,
  label,
  subtitle = `Available balance`,
  animationDelay,
  testId,
}: BalanceCardProps) {
  const amountMajor = amountCents / 100;
  const formatted = formatBalanceCurrency(amountMajor, currencyCode);
  const isPositive = amountCents > 0;
  const isNegative = amountCents < 0;

  const amountColorClass = isNegative ? styles.amountNegative : isPositive ? styles.amountPositive : styles.amountZero;

  const iconVariant = isNegative ? `warning` : isPositive ? `success` : `primary`;

  return (
    <article
      className={styles.root}
      style={animationDelay != null ? { animationDelay: `${animationDelay}ms` } : undefined}
      aria-label={`${label ?? currencyCode}: ${formatted}`}
    >
      <div className={styles.header}>
        <IconBadge
          icon={<CurrencyDollarIcon className="h-6 w-6 text-white" />}
          variant={iconVariant}
          rounded="xl"
          interactive
        />
        <span className={styles.currencyBadge}>{label ?? currencyCode}</span>
      </div>
      <p className={`${styles.amount} ${amountColorClass}`} data-testid={testId}>
        {formatted}
      </p>
      <p className={styles.subtitle}>{subtitle}</p>
    </article>
  );
}
