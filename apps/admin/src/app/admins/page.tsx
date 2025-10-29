'use client';
import { useEffect, useState } from 'react';

import { Card } from '@remoola/ui/Card';
import { DataTable } from '@remoola/ui/DataTable';

import { api, HttpError } from '../../lib/api';

type User = { id: string; email: string; name: string; role: `client` | `admin` | `superadmin` };

export default function AdminsPage() {
  const [rows, setRows] = useState<User[]>([]);
  const [search, setSearch] = useState(``);

  const load = async () => {
    try {
      const admins = await api.admins.search<User[]>(encodeURIComponent(search));
      setRows(admins || []);
    } catch (error) {
      if (error instanceof HttpError) console.error(`Request failed`, error.status, error.body);
      else if (!(error instanceof DOMException)) console.error(error);
    }
  };
  useEffect(() => void load(), [search]);

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Admins</h1>
      <p className="mt-1 text-sm text-gray-600">Promote admins, manage access.</p>

      <section className="mt-4">
        <Card
          actions={
            <input
              className="w-64 rounded-lg border px-3 py-2 text-sm"
              placeholder="Search email or name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          }
        >
          <DataTable<User>
            rows={rows}
            rowKey={(r) => r.id}
            columns={[
              { key: `email`, header: `Email` },
              { key: `name`, header: `Name` },
              {
                key: `role`,
                header: `Role`,
                render: (u) => (
                  <select
                    className="rounded border px-2 py-1 text-sm"
                    value={u.role}
                    onChange={(e) =>
                      api.users //
                        .patch(u.id, { role: e.target.value } as Pick<User, `role`>)
                        .then(load)
                    }
                  >
                    <option value="client">client</option>
                    <option value="admin">admin</option>
                    <option value="superadmin">superadmin</option>
                  </select>
                ),
              },
            ]}
          />
        </Card>
      </section>
    </>
  );
}
