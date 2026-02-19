'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { StatusPill, DataTable, TableSkeleton, SearchWithClear } from '../../../components';
import styles from '../../../components/ui/classNames.module.css';
import { type PaymentRequest } from '../../../lib';
import { useDebouncedValue } from '../../../lib/client';
import { getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';

const DEFAULT_PAGE_SIZE = 10;
const STATUS_OPTIONS = [
  ``,
  `DRAFT`,
  `WAITING`,
  `WAITING_RECIPIENT_APPROVAL`,
  `PENDING`,
  `COMPLETED`,
  `DENIED`,
  `UNCOLLECTIBLE`,
];

type PaginatedResponse = {
  items: PaymentRequest[];
  total: number;
  page: number;
  pageSize: number;
};

export function PaymentRequestsPageClient() {
  const [items, setItems] = useState<PaymentRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [q, setQ] = useState(``);
  const qDebounced = useDebouncedValue(q, 400);
  const [status, setStatus] = useState(``);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams();
    params.set(`page`, String(page));
    params.set(`pageSize`, String(pageSize));
    if (qDebounced.trim()) params.set(`q`, qDebounced.trim());
    if (status) params.set(`status`, status);
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
    const data = (await response.json()) as PaginatedResponse;
    setItems(data.items ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, pageSize, qDebounced, status]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const resetFilters = useCallback(() => {
    setQ(``);
    setStatus(``);
    setPage(1);
  }, []);

  if (loading && items.length === 0 && !loadError) {
    return (
      <div className={styles.adminPageStack}>
        <div>
          <h1 className={styles.adminPageTitle}>Payment Requests</h1>
          <p className={styles.adminPageSubtitle}>Payment Request (payer/requester, status, rail, dates).</p>
        </div>
        <TableSkeleton rows={8} columns={7} />
      </div>
    );
  }

  if (loadError && items.length === 0) {
    return (
      <div className={styles.adminPageStack}>
        <div>
          <h1 className={styles.adminPageTitle}>Payment Requests</h1>
          <p className={styles.adminPageSubtitle}>Payment Request (payer/requester, status, rail, dates).</p>
        </div>
        <div className={styles.adminCard}>
          <div className={styles.adminCardContent}>
            <button type="button" className={styles.adminPrimaryButton} onClick={() => void load()}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminPageStack}>
      <div className={styles.adminHeaderRow}>
        <div>
          <h1 className={styles.adminPageTitle}>Payment Requests</h1>
          <p className={styles.adminPageSubtitle}>Payment Request (payer/requester, status, rail, dates).</p>
        </div>
        <button type="button" className={styles.adminPrimaryButton} onClick={() => void load()} disabled={loading}>
          {loading ? `Refreshing...` : `Refresh`}
        </button>
      </div>

      <div className={styles.adminCard}>
        <div className={styles.adminCardContent}>
          <div className="flex flex-wrap items-center gap-4">
            <label className={styles.adminFormLabelBlock} style={{ marginBottom: 0 }}>
              <span className={styles.adminFormLabelText}>Search</span>
              <SearchWithClear
                value={q}
                onChangeAction={(v) => {
                  setQ(v);
                  setPage(1);
                }}
                placeholder="ID, description, payer or requester email"
              />
            </label>
            <label className={styles.adminFormLabelBlock} style={{ marginBottom: 0 }}>
              <span className={styles.adminFormLabelText}>Status</span>
              <select
                className={styles.adminFormInput}
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All</option>
                {STATUS_OPTIONS.filter(Boolean).map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ` `)}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className={styles.adminPrimaryButton} onClick={resetFilters} disabled={loading}>
              Reset filters
            </button>
          </div>
        </div>
      </div>

      {total > 0 && (
        <div className={styles.adminPaginationBar}>
          <span className={styles.adminPaginationInfo}>
            Showing {from}–{to} of {total}
          </span>
          <button
            type="button"
            className={styles.adminPaginationButton}
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
    </div>
  );
}
