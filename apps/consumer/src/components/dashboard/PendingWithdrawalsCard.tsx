'use client';

import { useEffect, useState } from 'react';

import { PaymentDirection, TransactionStatus } from '@remoola/api-types';

import {
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
} from '../ui/classNames';

type Transaction = {
  id: string;
  code: string;
  amount: string;
  status: string;
  createdAt: string | null;
};

type HistoryResponse = { items: Transaction[]; total: number };

export function PendingWithdrawalsCard() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const search = new URLSearchParams({
          direction: PaymentDirection.OUTCOME,
          status: TransactionStatus.PENDING,
          limit: `5`,
        });
        const res = await fetch(`/api/payments/history?${search.toString()}`, { credentials: `include` });
        if (!res.ok) return;
        const json = (await res.json()) as HistoryResponse;
        setData(json);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

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
