'use client';

import { IconBadge } from './IconBadge';
import { CurrencyDollarIcon } from './icons/CurrencyDollarIcon';
import { formatBalanceCurrency } from '../utils/date-format';

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

  const amountColor = isNegative
    ? `text-amber-600 dark:text-amber-300`
    : isPositive
      ? `text-emerald-600 dark:text-emerald-300`
      : `text-slate-600 dark:text-slate-100`;

  const iconVariant = isNegative ? `warning` : isPositive ? `success` : `primary`;

  return (
    <article
      className={`
        group
        overflow-hidden
        rounded-2xl
        border
        border-slate-200
        bg-linear-to-br
        from-white
        to-slate-50
        p-5
        shadow-lg
        transition-all
        duration-300
        hover:shadow-xl
        hover:scale-105
        animate-fadeIn
        dark:border-slate-700
        dark:from-slate-800
        dark:to-slate-900
      `}
      style={animationDelay != null ? { animationDelay: `${animationDelay}ms` } : undefined}
      aria-label={`${label ?? currencyCode}: ${formatted}`}
    >
      <div
        className={`
          flex
          items-start
          justify-between
          mb-3
        `}
      >
        <IconBadge
          icon={<CurrencyDollarIcon className={`h-6 w-6 text-white`} />}
          variant={iconVariant}
          rounded="xl"
          interactive
        />
        <span
          className={`
            rounded-lg
            border
            border-slate-200
            bg-slate-100
            px-2.5
            py-1
            text-xs
            font-bold
            text-slate-700
            dark:border-slate-700
            dark:bg-slate-900/50
            dark:text-slate-300
          `}
        >
          {label ?? currencyCode}
        </span>
      </div>
      <p className={`text-3xl font-extrabold tabular-nums ${amountColor}`} data-testid={testId}>
        {formatted}
      </p>
      <p
        className={`
          mt-2
          text-xs
          font-semibold
          text-slate-500
          dark:text-slate-400
        `}
      >
        {subtitle}
      </p>
    </article>
  );
}
