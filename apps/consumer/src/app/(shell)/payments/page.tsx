'use client';
import { useEffect, useState } from 'react';

import { Badge } from '@remoola/ui/Badge';
import { Card } from '@remoola/ui/Card';

import { getJson, postJson } from '../../../lib/api';

type Payment = {
  id: string;
  contract: string;
  amount: string;
  method: string;
  status: `Completed` | `Pending` | `Failed`;
  date: string;
};

export default function PaymentsPage() {
  const [rows, setRows] = useState<Payment[]>([]);

  const load = () =>
    getJson<Payment[]>(`/payments`)
      .then(setRows)
      .catch(() => {});

  useEffect(() => void load(), []);

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Payments</h1>
      <p className="mt-1 text-sm text-gray-600">Track and issue contractor payments.</p>

      <section className="mt-5">
        <Card
          actions={
            <button
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
              onClick={async () => {
                const contracts = await getJson<Payment[]>(`/contracts`);
                const contractId = contracts?.[0]?.id;
                if (contractId) {
                  await postJson(`/payments`, { contractId, amountCents: 160000 });
                  load();
                }
              }}
            >
              Start Payment
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-gray-500">
                  <th className="py-2 pr-4">Payment ID</th>
                  <th className="py-2 pr-4">Contract</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Method</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="py-3 pr-4 font-medium text-gray-900">{p.id.slice(0, 8)}</td>
                    <td className="py-3 pr-4 text-gray-700">{p.contract}</td>
                    <td className="py-3 pr-4 text-gray-700">{p.amount}</td>
                    <td className="py-3 pr-4 text-gray-700">{p.method}</td>
                    <td className="py-3 pr-4">
                      {p.status == `Completed` && <Badge tone="green" label="Completed" />}
                      {p.status == `Pending` && <Badge tone="blue" label="Pending" />}
                      {p.status == `Failed` && <Badge tone="red" label="Failed" />}
                    </td>
                    <td className="py-3 text-gray-600">{p.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </>
  );
}
