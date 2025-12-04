'use client';
import { useCallback, useEffect, useState } from 'react';

import { Card } from '@remoola/ui/Card';
import { DataTable } from '@remoola/ui/DataTable';

import { api, HttpError } from '../../lib/api';

type Doc = { id: string; name: string; type: string; sizeBytes?: number; updatedAt?: string; fileUrl?: string };

export default function DocumentsPage() {
  const [search] = useState(``);
  const [rows, setRows] = useState<Doc[]>([]);

  const load = useCallback(async () => {
    try {
      const documents = await api.documents.search<Doc[]>(encodeURIComponent(search));
      setRows(documents || []);
    } catch (error) {
      if (error instanceof HttpError) console.error(`Request failed`, error.status, error.body);
      else if (!(error instanceof DOMException)) console.error(error);
    }
  }, [search]);
  useEffect(() => void load(), [load]);

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
      <p className="mt-1 text-sm text-gray-600">Central view across all uploaded assets.</p>

      <section className="mt-4">
        <Card>
          <DataTable<Doc>
            rows={rows}
            rowKey={(r) => r.id}
            columns={[
              {
                key: `name`,
                header: `Name`,
                render: (d) => (
                  <a className="hover:underline" href={d.fileUrl || `#`}>
                    {d.name}
                  </a>
                ),
              },
              { key: `type`, header: `Type`, render: (d) => d.type?.toUpperCase() || `—` },
              {
                key: `size`,
                header: `Size`,
                render: (d) => (d.sizeBytes ? `${(d.sizeBytes / 1024).toFixed(0)} KB` : `—`),
              },
              {
                key: `updated`,
                header: `Updated`,
                render: (d) => (d.updatedAt ? new Date(d.updatedAt).toLocaleString() : `—`),
              },
              {
                key: `actions`,
                header: `Actions`,
                render: (d) => (
                  <button
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => api.documents.delete(d.id).then(load)}
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
