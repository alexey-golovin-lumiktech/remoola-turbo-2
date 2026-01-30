'use client';

import { formatCurrencyAmount } from '../../lib/currency';
import styles from '../ui/classNames.module.css';

const { balanceCard, balanceLabel, balanceValue, balancesLoading, balancesRow } = styles;

type BalanceMap = Record<string, number>;
type BalancesPanelProps = { balances: BalanceMap };

export function BalancesPanel({ balances }: BalancesPanelProps) {
  const entries = Object.entries(balances);

  if (entries.length === 0) {
    return <p className={balancesLoading}>Loading balances...</p>;
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
