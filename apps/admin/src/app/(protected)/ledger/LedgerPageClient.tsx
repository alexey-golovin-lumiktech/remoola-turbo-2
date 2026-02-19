'use client';

import { useEffect, useState } from 'react';

import { StatusPill, DataTable } from '../../../components';
import styles from '../../../components/ui/classNames.module.css';
import { type LedgerEntry } from '../../../lib';

export function LedgerPageClient() {
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);

  useEffect(() => {
    async function getLedger(): Promise<LedgerEntry[]> {
      const response = await fetch(`/api/ledger`, { cache: `no-store`, credentials: `include` });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : (data?.items ?? []);
    }

    getLedger().then(setLedgerEntries);
  }, []);

  return (
    <div className={styles.adminPageStack}>
      <div>
        <h1 className={styles.adminPageTitle}>Ledger</h1>
        <p className={styles.adminPageSubtitle}>Ledger Entry (signed amounts, idempotencyKey, stripeId).</p>
      </div>

      <DataTable<LedgerEntry>
        rows={ledgerEntries}
        getRowKeyAction={(r) => r.id}
        columns={[
          {
            key: `ledgerId`,
            header: `Ledger`,
            render: (r) => <span className={styles.adminMonoCode}>{r.ledgerId.slice(0, 8)}…</span>,
          },
          { key: `type`, header: `Type`, render: (r) => <span className={styles.adminTextGray700}>{r.type}</span> },
          { key: `status`, header: `Status`, render: (r) => <StatusPill value={r.status} /> },
          {
            key: `amt`,
            header: `Amount`,
            render: (r) => (
              <span className={styles.adminTextMedium}>
                {r.currencyCode} {r.amount}
              </span>
            ),
          },
          {
            key: `fees`,
            header: `Fees`,
            render: (r) => (
              <span className={styles.adminTextGray700}>{r.feesAmount ? `${r.feesAmount} (${r.feesType})` : `—`}</span>
            ),
          },
          {
            key: `stripe`,
            header: `Stripe`,
            render: (r) => <span className={styles.adminTextGray600}>{r.stripeId ?? `—`}</span>,
          },
          {
            key: `idem`,
            header: `Idempotency`,
            render: (r) => <span className={styles.adminTextGray600}>{r.idempotencyKey ?? `—`}</span>,
          },
          {
            key: `created`,
            header: `Created`,
            render: (r) => <span className={styles.adminTextGray600}>{new Date(r.createdAt).toLocaleString()}</span>,
          },
        ]}
      />
    </div>
  );
}
