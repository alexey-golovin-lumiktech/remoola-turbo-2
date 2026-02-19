'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { type TAdminLedgerListQuery } from '@remoola/api-types';

import { DataTable, StatusPill, TableSkeleton } from '../../../components';
import styles from '../../../components/ui/classNames.module.css';
import { type LedgerEntry, type PaginatedResponse } from '../../../lib';
import { getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';

type LedgerTableBlockProps = {
  page: number;
  pageSize: number;
  onPageChangeAction: (page: number) => void;
  q: string;
  typeFilter: string;
  statusFilter: string;
  includeDeleted: boolean;
  refreshKey: number;
};

export function LedgerTableBlock({
  page,
  pageSize,
  onPageChangeAction,
  q,
  typeFilter,
  statusFilter,
  includeDeleted,
}: LedgerTableBlockProps) {
  const [items, setItems] = useState<LedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const query = {
      page: String(page),
      pageSize: String(pageSize),
      ...(q.trim() && { q: q.trim() }),
      ...(typeFilter && { type: typeFilter }),
      ...(statusFilter && { status: statusFilter }),
      ...(includeDeleted && { includeDeleted: `true` }),
    } as Partial<TAdminLedgerListQuery>;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== ``) params.set(key, value);
    }
    const response = await fetch(`/api/ledger?${params.toString()}`, {
      cache: `no-store`,
      credentials: `include`,
    });
    if (!response.ok) {
      setItems([]);
      setTotal(0);
      setLoadError(getLocalToastMessage(localToastKeys.LOAD_LEDGER_ENTRIES));
      setLoading(false);
      toast.error(getLocalToastMessage(localToastKeys.LOAD_LEDGER_ENTRIES));
      return;
    }
    const data = (await response.json()) as PaginatedResponse<LedgerEntry>;
    setItems(data.items ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, pageSize, q, typeFilter, statusFilter, includeDeleted]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (loading && items.length === 0 && !loadError) {
    return <TableSkeleton rows={8} columns={9} />;
  }

  if (loadError && items.length === 0) {
    return (
      <div className={styles.adminCard}>
        <div className={styles.adminCardContent}>
          <button type="button" className={styles.adminPrimaryButton} onClick={() => void load()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {total > 0 && (
        <div className={styles.adminPaginationBar}>
          <span className={styles.adminPaginationInfo}>
            Showing {from}–{to} of {total}
          </span>
          <button
            type="button"
            className={styles.adminPaginationButton}
            disabled={page <= 1 || loading}
            onClick={() => onPageChangeAction(Math.max(1, page - 1))}
          >
            Previous
          </button>
          <span className={styles.adminPaginationInfo}>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className={styles.adminPaginationButton}
            disabled={page >= totalPages || loading}
            onClick={() => onPageChangeAction(Math.min(totalPages, page + 1))}
          >
            Next
          </button>
        </div>
      )}

      {!loading && total === 0 && (
        <div className={styles.adminCard}>
          <div className={styles.adminCardContent}>
            <div className={styles.adminTextGray500}>No ledger entries</div>
          </div>
        </div>
      )}

      {total > 0 && (
        <DataTable<LedgerEntry>
          rows={items}
          getRowKeyAction={(r) => r.id}
          columns={[
            {
              key: `ledgerId`,
              header: `Ledger`,
              render: (r) => <span className={styles.adminMonoCode}>{r.ledgerId.slice(0, 8)}…</span>,
            },
            {
              key: `consumer`,
              header: `Consumer`,
              render: (r) => (
                <Link href={`/consumers/${r.consumerId}`} className={styles.adminMonoCode}>
                  {r.consumerId.slice(0, 8)}…
                </Link>
              ),
            },
            {
              key: `paymentRequest`,
              header: `Payment Request`,
              render: (r) =>
                r.paymentRequestId ? (
                  <Link href={`/payment-requests/${r.paymentRequestId}`} className={styles.adminMonoCode}>
                    {r.paymentRequestId.slice(0, 8)}…
                  </Link>
                ) : (
                  <span className={styles.adminTextGray600}>—</span>
                ),
            },
            {
              key: `type`,
              header: `Type`,
              render: (r) => <span className={styles.adminTextGray700}>{r.type}</span>,
            },
            {
              key: `status`,
              header: `Status`,
              render: (r) => <StatusPill value={r.status} />,
            },
            {
              key: `amt`,
              header: `Amount`,
              render: (r) => (
                <span className={styles.adminTextMedium}>
                  {r.currencyCode} {r.amount}
                </span>
              ),
            },
            {
              key: `fees`,
              header: `Fees`,
              render: (r) => (
                <span className={styles.adminTextGray700}>
                  {r.feesAmount ? `${r.feesAmount} (${r.feesType})` : `—`}
                </span>
              ),
            },
            {
              key: `stripe`,
              header: `Stripe`,
              render: (r) => <span className={styles.adminTextGray600}>{r.stripeId ?? `—`}</span>,
            },
            {
              key: `idem`,
              header: `Idempotency`,
              render: (r) => <span className={styles.adminTextGray600}>{r.idempotencyKey ?? `—`}</span>,
            },
            {
              key: `created`,
              header: `Created`,
              render: (r) => <span className={styles.adminTextGray600}>{new Date(r.createdAt).toLocaleString()}</span>,
            },
          ]}
        />
      )}
    </>
  );
}
