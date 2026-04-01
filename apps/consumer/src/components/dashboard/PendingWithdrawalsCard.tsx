'use client';

import { type IPendingWithdrawal } from '../../types/dashboard';
import styles from '../ui/classNames.module.css';

const {
  pendingWithdrawalsAmount,
  pendingWithdrawalsBadge,
  pendingWithdrawalsCard,
  pendingWithdrawalsCode,
  pendingWithdrawalsCount,
  pendingWithdrawalsHeader,
  pendingWithdrawalsHint,
  pendingWithdrawalsItem,
  pendingWithdrawalsList,
  pendingWithdrawalsTitle,
} = styles;

type PendingWithdrawalsCardProps = {
  data: {
    items: IPendingWithdrawal[];
    total: number;
  };
};

export function PendingWithdrawalsCard({ data }: PendingWithdrawalsCardProps) {
  const loading = false;

  return (
    <div className={pendingWithdrawalsCard}>
      <div className={pendingWithdrawalsHeader}>
        <h3 className={pendingWithdrawalsTitle}>Pending withdrawals</h3>
        {data && data.total > 0 && <span className={pendingWithdrawalsCount}>{data.total} total</span>}
      </div>

      {loading && <p className={pendingWithdrawalsHint}>Loading…</p>}

      {!loading && (!data || data.items.length === 0) && (
        <p className={pendingWithdrawalsHint}>No pending withdrawals.</p>
      )}

      {!loading && data && data.items.length > 0 && (
        <ul className={pendingWithdrawalsList}>
          {data.items.map((tx) => (
            <li key={tx.id} className={pendingWithdrawalsItem}>
              <div>
                <div className={pendingWithdrawalsAmount}>-${Number(tx.amount).toFixed(2)}</div>
                <div className={pendingWithdrawalsCode}>Code {tx.code}</div>
              </div>
              <span className={pendingWithdrawalsBadge}>Pending</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
