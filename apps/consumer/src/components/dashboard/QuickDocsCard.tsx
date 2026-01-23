'use client';

import Link from 'next/link';

import { type IQuickDoc } from '../../types';

type QuickDocsCardProps = { docs: IQuickDoc[] };

export function QuickDocsCard({ docs }: QuickDocsCardProps) {
  return (
    <section>
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Quick Docs</h2>
        <Link href="/documents" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
          View all
        </Link>
      </header>

      {docs.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          No documents yet. Upload contracts, W-9s and invoices to see them here.
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="truncate text-slate-800 dark:text-slate-200">{doc.name}</span>
              <span className="whitespace-nowrap text-xs text-slate-400 dark:text-slate-500">
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
