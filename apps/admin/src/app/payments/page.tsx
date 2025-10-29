'use client';
import { useEffect, useState } from 'react';

import { Badge } from '@remoola/ui/Badge';
import { Card } from '@remoola/ui/Card';
import { DataTable } from '@remoola/ui/DataTable';

import { api, HttpError } from '../../lib/api';

type Pay = {
  id: string;
  amountCents: number;
  status: `Pending` | `Completed` | `Failed`;
  contract?: { contractor?: { name: string } };
};

export default function PaymentsPage() {
  const [rows, setRows] = useState<Pay[]>([]);

  const load = async () => {
    try {
      const payments = await api.payments.list<Pay[]>();
      setRows(payments || []);
    } catch (error) {
      if (error instanceof HttpError) console.error(`Request failed`, error.status, error.body);
      else if (!(error instanceof DOMException)) console.error(error);
    }
  };
  useEffect(() => void load(), []);

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
      <p className="mt-1 text-sm text-gray-600">Track batches and handle exceptions.</p>

      <section className="mt-4">
        <Card>
          <DataTable<Pay>
            rows={rows}
            rowKey={(r) => r.id}
            columns={[
              { key: `id`, header: `ID`, render: (p) => p.id.slice(0, 8) },
              { key: `contractor`, header: `Contractor`, render: (p) => p.contract?.contractor?.name || `—` },
              { key: `amount`, header: `Amount`, render: (p) => `$${(p.amountCents / 100).toFixed(2)}` },
              {
                key: `status`,
                header: `Status`,
                render: (p) => (
                  <Badge
                    label={p.status}
                    tone={p.status === `Completed` ? `green` : p.status === `Pending` ? `blue` : `red`}
                  />
                ),
              },
              {
                key: `actions`,
                header: `Actions`,
                render: (p) => (
                  <button
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => api.payments.delete(p.id).then(load)}
                  >
                    Delete
                  </button>
                ),
              },
            ]}
          />
        </Card>
      </section>
    </>
  );
}
