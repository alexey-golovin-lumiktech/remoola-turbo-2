'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { type TAdminPaymentRequestsListQuery } from '@remoola/api-types';

import { DataTable, StatusPill, TableSkeleton } from '../../../components';
import styles from '../../../components/ui/classNames.module.css';
import { type PaginatedResponse, type PaymentRequest } from '../../../lib';
import { getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';

type PaymentRequestsTableBlockProps = {
  page: number;
  pageSize: number;
  onPageChangeAction: (page: number) => void;
  q: string;
  status: string;
  includeDeleted: boolean;
  refreshKey: number;
};

export function PaymentRequestsTableBlock({
  page,
  pageSize,
  onPageChangeAction,
  q,
  status,
  includeDeleted,
}: PaymentRequestsTableBlockProps) {
  const [items, setItems] = useState<PaymentRequest[]>([]);
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
      ...(status && { status }),
      ...(includeDeleted && { includeDeleted: `true` }),
    } as Partial<TAdminPaymentRequestsListQuery>;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== ``) params.set(key, value);
    }
    const response = await fetch(`/api/payment-requests?${params.toString()}`, {
      cache: `no-store`,
      credentials: `include`,
    });
    if (!response.ok) {
      setItems([]);
      setTotal(0);
      setLoadError(getLocalToastMessage(localToastKeys.LOAD_PAYMENT_REQUESTS));
      setLoading(false);
      toast.error(getLocalToastMessage(localToastKeys.LOAD_PAYMENT_REQUESTS));
      return;
    }
    const data = (await response.json()) as PaginatedResponse<PaymentRequest>;
    setItems(data.items ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, pageSize, q, status, includeDeleted]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (loading && items.length === 0 && !loadError) {
    return <TableSkeleton rows={8} columns={7} />;
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
            <div className={styles.adminTextGray500}>No payment requests</div>
          </div>
        </div>
      )}

      {total > 0 && (
        <DataTable<PaymentRequest>
          rows={items}
          getRowKeyAction={(r) => r.id}
          rowHrefAction={(r) => `/payment-requests/${r.id}`}
          columns={[
            {
              key: `id`,
              header: `ID`,
              render: (r) => <span className={styles.adminMonoCode}>{r.id ? `${r.id.slice(0, 8)}…` : `—`}</span>,
            },
            {
              key: `status`,
              header: `Status`,
              render: (r) => <StatusPill value={r.status} />,
            },
            {
              key: `amount`,
              header: `Amount`,
              render: (r) => (
                <span className={styles.adminTextMedium}>
                  {r.currencyCode} {r.amount}
                </span>
              ),
            },
            {
              key: `rail`,
              header: `Rail`,
              render: (r) => <span className={styles.adminTextGray700}>{r.paymentRail ?? `—`}</span>,
            },
            {
              key: `payer`,
              header: `Payer`,
              render: (r) => (
                <span className={styles.adminTextGray700}>
                  {r.payer?.email ?? r.payerEmail ?? (r.payerId ? `${r.payerId.slice(0, 8)}…` : `—`)}
                </span>
              ),
            },
            {
              key: `req`,
              header: `Requester`,
              render: (r) => (
                <span className={styles.adminTextGray700}>
                  {r.requester?.email ?? (r.requesterId ? `${r.requesterId.slice(0, 8)}…` : `—`)}
                </span>
              ),
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
