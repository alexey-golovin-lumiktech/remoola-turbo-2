'use client';

import Link from 'next/link';

import { type IQuickDoc } from '../../types';

export function QuickDocsCard({ docs }: { docs: IQuickDoc[] }) {
  return (
    <section>
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Quick Docs</h2>
        <Link href="/documents" className="text-xs font-medium text-blue-600 hover:underline">
          View all
        </Link>
      </header>

      {docs.length === 0 ? (
        <p className="text-sm text-slate-400">
          No documents yet. Upload contracts, W-9s and invoices to see them here.
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="truncate text-slate-800">{doc.name}</span>
              <span className="whitespace-nowrap text-xs text-slate-400">
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: `short`,
                }).format(new Date(doc.createdAt))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
