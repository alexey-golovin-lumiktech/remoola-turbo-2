'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { StatusPill, DataTable, TableSkeleton, SearchWithClear } from '../../../components';
import styles from '../../../components/ui/classNames.module.css';
import { type LedgerEntry } from '../../../lib';
import { useDebouncedValue } from '../../../lib/client';
import { getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';

const DEFAULT_PAGE_SIZE = 10;
const TYPE_OPTIONS = [`USER_PAYMENT`, `USER_PAYMENT_REVERSAL`, `PLATFORM_FEE`, `PLATFORM_FEE_REVERSAL`, `USER_DEPOSIT`];
const STATUS_OPTIONS = [`DRAFT`, `WAITING`, `PENDING`, `COMPLETED`, `DENIED`, `UNCOLLECTIBLE`];

type PaginatedResponse = {
  items: LedgerEntry[];
  total: number;
  page: number;
  pageSize: number;
};

export function LedgerPageClient() {
  const [items, setItems] = useState<LedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [q, setQ] = useState(``);
  const qDebounced = useDebouncedValue(q, 400);
  const [typeFilter, setTypeFilter] = useState(``);
  const [statusFilter, setStatusFilter] = useState(``);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams();
    params.set(`page`, String(page));
    params.set(`pageSize`, String(pageSize));
    if (qDebounced.trim()) params.set(`q`, qDebounced.trim());
    if (typeFilter) params.set(`type`, typeFilter);
    if (statusFilter) params.set(`status`, statusFilter);
    const response = await fetch(`/api/ledger?${params.toString()}`, { cache: `no-store`, credentials: `include` });
    if (!response.ok) {
      setItems([]);
      setTotal(0);
      setLoadError(getLocalToastMessage(localToastKeys.LOAD_LEDGER_ENTRIES));
      setLoading(false);
      toast.error(getLocalToastMessage(localToastKeys.LOAD_LEDGER_ENTRIES));
      return;
    }
    const data = (await response.json()) as PaginatedResponse;
    setItems(data.items ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, pageSize, qDebounced, typeFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const resetFilters = useCallback(() => {
    setQ(``);
    setTypeFilter(``);
    setStatusFilter(``);
    setPage(1);
  }, []);

  if (loading && items.length === 0 && !loadError) {
    return (
      <div className={styles.adminPageStack}>
        <div>
          <h1 className={styles.adminPageTitle}>Ledger</h1>
          <p className={styles.adminPageSubtitle}>Ledger Entry (signed amounts, idempotencyKey, stripeId).</p>
        </div>
        <TableSkeleton rows={8} columns={9} />
      </div>
    );
  }

  if (loadError && items.length === 0) {
    return (
      <div className={styles.adminPageStack}>
        <div>
          <h1 className={styles.adminPageTitle}>Ledger</h1>
          <p className={styles.adminPageSubtitle}>Ledger Entry (signed amounts, idempotencyKey, stripeId).</p>
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
          <h1 className={styles.adminPageTitle}>Ledger</h1>
          <p className={styles.adminPageSubtitle}>Ledger Entry (signed amounts, idempotencyKey, stripeId).</p>
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
                placeholder="ID, ledger ID, payment request ID"
              />
            </label>
            <label className={styles.adminFormLabelBlock} style={{ marginBottom: 0 }}>
              <span className={styles.adminFormLabelText}>Type</span>
              <select
                className={styles.adminFormInput}
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All</option>
                {TYPE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ` `)}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.adminFormLabelBlock} style={{ marginBottom: 0 }}>
              <span className={styles.adminFormLabelText}>Status</span>
              <select
                className={styles.adminFormInput}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
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
            { key: `type`, header: `Type`, render: (r) => <span className={styles.adminTextGray700}>{r.type}</span> },
            { key: `status`, header: `Status`, render: (r) => <StatusPill value={r.status} /> },
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
    </div>
  );
}
