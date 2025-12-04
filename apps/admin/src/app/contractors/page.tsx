'use client';
import { useCallback, useEffect, useState } from 'react';

import { Card } from '@remoola/ui/Card';
import { DataTable } from '@remoola/ui/DataTable';

import { api, HttpError } from '../../lib/api';

type Contractor = { id: string; name: string; email?: string; phone?: string };

export default function ContractorsPage() {
  const [rows, setRows] = useState<Contractor[]>([]);
  const [search, setSearch] = useState(``);
  const [name, setName] = useState(``);

  const load = useCallback(async () => {
    try {
      const contractors = await api.contractors.search<Contractor[]>(encodeURIComponent(search));
      setRows(contractors || []);
    } catch (error) {
      if (error instanceof HttpError) console.error(`Request failed`, error.status, error.body);
      else if (!(error instanceof DOMException)) console.error(error);
    }
  }, [search]);
  useEffect(() => void load(), [load]);

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Contractors</h1>
      <p className="mt-1 text-sm text-gray-600">Manage the global contractor directory.</p>

      <section className="mt-4">
        <Card
          actions={
            <div className="flex items-center gap-2">
              <input
                className="w-56 rounded-lg border px-3 py-2 text-sm"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <input
                className="w-56 rounded-lg border px-3 py-2 text-sm"
                placeholder="New contractor name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button
                className="rounded-xl bg-blue-600 px-3 py-2 text-sm text-white"
                onClick={async () => {
                  if (!name.trim()) return;
                  await api.contractors.create({ name });
                  setName(``);
                  load();
                }}
              >
                Add
              </button>
            </div>
          }
        >
          <DataTable<Contractor>
            rows={rows}
            rowKey={(r) => r.id}
            columns={[
              {
                key: `name`,
                header: `Name`,
                render: (c) => (
                  <input
                    defaultValue={c.name}
                    className="rounded border px-2 py-1 text-sm"
                    onBlur={(e) => api.contractors.patch(c.id, { name: e.target.value })}
                  />
                ),
              },
              { key: `email`, header: `Email` },
              { key: `phone`, header: `Phone` },
              {
                key: `actions`,
                header: `Actions`,
                render: (c) => (
                  <button
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => api.contractors.delete(c.id).then(load)}
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
