'use client';
import { useEffect, useState } from 'react';

import { Card } from '@remoola/ui/Card';

import { getJson, postJson } from '../../../lib/api';

type Doc = { id: string; name: string; type: string; size: string; updated: string; fileUrl?: string };

export default function DocumentsPage() {
  const [rows, setRows] = useState<Doc[]>([]);

  const load = () =>
    getJson<Doc[]>(`/documents`)
      .then(setRows)
      .catch(() => {});

  useEffect(() => void load(), []);

  const upload = async (file: File) => {
    const presigned = await postJson<{ url: string; fileUrl: string; method: `PUT` }>(`/documents/presigned`, {
      filename: file.name,
      contentType: file.type || `application/octet-stream`,
    });
    await fetch(presigned.url, { method: `PUT`, body: file });

    const contracts = await getJson<Doc[]>(`/contracts`);
    const contractId = contracts?.[0]?.id;

    await postJson(`/documents`, {
      contractId,
      name: file.name,
      type: `invoice`,
      fileUrl: presigned.fileUrl,
      sizeBytes: file.size,
    });

    load();
  };

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Documents</h1>
      <p className="mt-1 text-sm text-gray-600">Contracts, invoices, and compliance files.</p>

      <section className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          actions={
            <label className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow cursor-pointer">
              Upload
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f);
                }}
              />
            </label>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-gray-500">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Size</th>
                  <th className="py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="border-t border-gray-100">
                    <td className="py-3 pr-4 font-medium text-gray-900">
                      <a className="hover:underline" href={d.fileUrl ?? `#`}>
                        {d.name}
                      </a>
                    </td>
                    <td className="py-3 pr-4 text-gray-700 capitalize">{d.type}</td>
                    <td className="py-3 pr-4 text-gray-700">{d.size}</td>
                    <td className="py-3 text-gray-600">{d.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Filters">
          <div className="space-y-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" /> Invoices
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" /> Contracts
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" /> Compliance
            </label>
            <div className="pt-2">
              <input
                placeholder="Search docs..."
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </Card>
      </section>
    </>
  );
}
