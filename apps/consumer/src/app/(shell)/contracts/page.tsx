'use client';
import { useEffect, useState } from 'react';

import { Badge } from '@remoola/ui/Badge';
import { Card } from '@remoola/ui/Card';

import { getJson, postJson, putJson } from '../../../lib/api';

type Row = {
  id: string;
  contractorId: string;
  contractorName: string;
  rate: string;
  status: string;
  lastActivityAgo: string;
};

export default function ContractsPage() {
  const [rows, setRows] = useState<Row[]>([]);

  const load = () =>
    getJson<Row[]>(`/contracts`)
      .then(setRows)
      .catch(() => {});

  useEffect(() => void load(), []);

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Contracts</h1>
      <p className="mt-1 text-sm text-gray-600">Manage contractor agreements and signatures.</p>

      <section className="mt-5">
        <Card
          actions={
            <button
              onClick={async () => {
                await postJson(`/contracts`, {
                  contractorId: rows[0]?.contractorId,
                  rateCents: 8000,
                  rateUnit: `hour`,
                  some: 2222222222,
                });
                load();
              }}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
            >
              New Contract
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-gray-500">
                  <th className="py-2 pr-4">Contractor</th>
                  <th className="py-2 pr-4">Rate</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Updated</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="py-3 pr-4 font-medium text-gray-900">{c.contractorName}</td>
                    <td className="py-3 pr-4 text-gray-700">{c.rate}</td>
                    <td className="py-3 pr-4">
                      {c.status == `Active` ? (
                        <Badge label="Active" tone="green" />
                      ) : (
                        <Badge label={c.status} tone="blue" />
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{c.lastActivityAgo}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button
                          className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                          onClick={async () => {
                            await putJson(`/contracts/${c.id}`, { status: `active` });
                            load();
                          }}
                        >
                          Activate
                        </button>
                      </div>
                    </td>
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
