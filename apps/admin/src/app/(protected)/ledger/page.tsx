'use client';

import { useEffect, useState } from 'react';

import { DataTable } from '../../../components/DataTable';
import { StatusPill } from '../../../components/StatusPill';
import { type LedgerEntry } from '../../../lib/types';

export default function LedgerPage() {
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);

  useEffect(() => {
    async function getLedger(): Promise<LedgerEntry[]> {
      const response = await fetch(`/api/ledger`, { cache: `no-store`, credentials: `include` });
      if (!response.ok) return [];
      return await response.json();
    }

    getLedger().then(setLedgerEntries);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Ledger</h1>
        <p className="text-sm text-gray-600">Ledger Entry (signed amounts, idempotencyKey, stripeId).</p>
      </div>

      <DataTable<LedgerEntry>
        rows={ledgerEntries}
        getRowKeyAction={(r) => r.id}
        columns={[
          {
            key: `ledgerId`,
            header: `Ledger`,
            render: (r) => <span className="font-mono text-xs">{r.ledgerId.slice(0, 8)}…</span>,
          },
          { key: `type`, header: `Type`, render: (r) => <span className="text-gray-700">{r.type}</span> },
          { key: `status`, header: `Status`, render: (r) => <StatusPill value={r.status} /> },
          {
            key: `amt`,
            header: `Amount`,
            render: (r) => (
              <span className="font-medium">
                {r.currencyCode} {r.amount}
              </span>
            ),
          },
          {
            key: `fees`,
            header: `Fees`,
            render: (r) => (
              <span className="text-gray-700">{r.feesAmount ? `${r.feesAmount} (${r.feesType})` : `—`}</span>
            ),
          },
          {
            key: `stripe`,
            header: `Stripe`,
            render: (r) => <span className="text-gray-600">{r.stripeId ?? `—`}</span>,
          },
          {
            key: `idem`,
            header: `Idempotency`,
            render: (r) => <span className="text-gray-600">{r.idempotencyKey ?? `—`}</span>,
          },
          {
            key: `created`,
            header: `Created`,
            render: (r) => <span className="text-gray-600">{new Date(r.createdAt).toLocaleString()}</span>,
          },
        ]}
      />
    </div>
  );
}
