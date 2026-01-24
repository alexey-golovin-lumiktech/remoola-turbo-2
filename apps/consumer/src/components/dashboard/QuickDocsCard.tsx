'use client';

import Link from 'next/link';

import { type IQuickDoc } from '../../types';
import {
  quickDocsDate,
  quickDocsEmpty,
  quickDocsHeader,
  quickDocsItem,
  quickDocsLink,
  quickDocsList,
  quickDocsName,
  quickDocsTitle,
} from '../ui/classNames';

type QuickDocsCardProps = { docs: IQuickDoc[] };

export function QuickDocsCard({ docs }: QuickDocsCardProps) {
  return (
    <section>
      <header className={quickDocsHeader}>
        <h2 className={quickDocsTitle}>Quick Docs</h2>
        <Link href="/documents" className={quickDocsLink}>
          View all
        </Link>
      </header>

      {docs.length === 0 ? (
        <p className={quickDocsEmpty}>No documents yet. Upload contracts, W-9s and invoices to see them here.</p>
      ) : (
        <ul className={quickDocsList}>
          {docs.map((doc) => (
            <li key={doc.id} className={quickDocsItem}>
              <span className={quickDocsName}>{doc.name}</span>
              <span className={quickDocsDate}>
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
