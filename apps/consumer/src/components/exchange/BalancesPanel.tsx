'use client';

import { formatCurrencyAmount } from '../../lib/currency';
import { ErrorState } from '../ui';
import styles from '../ui/classNames.module.css';

const { balanceCard, balanceLabel, balanceValue, balancesEmpty, balancesLoading, balancesRow } = styles;

type BalanceMap = Record<string, number>;
type BalancesPanelProps = {
  balances: BalanceMap;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function BalancesPanel({ balances, loading, error, onRetry }: BalancesPanelProps) {
  const entries = Object.entries(balances);

  if (loading && entries.length === 0 && !error) {
    return (
      <p className={balancesLoading} role="status" aria-live="polite">
        Loading balances...
      </p>
    );
  }

  if (error && entries.length === 0) {
    return <ErrorState title="Failed to load balances" message={error} onRetry={onRetry} />;
  }

  if (entries.length === 0) {
    return (
      <p className={balancesEmpty} role="status" aria-live="polite">
        No balances available yet.
      </p>
    );
  }

  return (
    <div className={balancesRow}>
      {entries.map(([code, amount]) => (
        <div key={code} className={balanceCard}>
          <div className={balanceLabel}>{code} balance</div>
          <div className={balanceValue}>
            {formatCurrencyAmount(amount, code)} {code}
          </div>
        </div>
      ))}
    </div>
  );
}
