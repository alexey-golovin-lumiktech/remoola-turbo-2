'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { type TAdminExpectationDateArchiveQuery } from '@remoola/api-types';

import { DataTable, TableSkeleton } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';
import { type PaginatedResponse, type PaymentRequestExpectationDateArchive } from '../../../../lib';
import { getLocalToastMessage, localToastKeys } from '../../../../lib/error-messages';

type ExpectationDateArchiveTableBlockProps = {
  page: number;
  pageSize: number;
  onPageChangeAction: (page: number) => void;
  q: string;
  refreshKey: number;
};

export function ExpectationDateArchiveTableBlock({
  page,
  pageSize,
  onPageChangeAction,
  q,
}: ExpectationDateArchiveTableBlockProps) {
  const [rows, setRows] = useState<PaymentRequestExpectationDateArchive[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const query = {
      page: String(page),
      pageSize: String(pageSize),
      ...(q.trim() && { q: q.trim() }),
    } as Partial<TAdminExpectationDateArchiveQuery>;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== ``) params.set(key, value);
    }
    const response = await fetch(`/api/payment-requests/expectation-date-archive?${params.toString()}`, {
      cache: `no-store`,
      credentials: `include`,
    });
    if (!response.ok) {
      setRows([]);
      setTotal(0);
      setError(getLocalToastMessage(localToastKeys.LOAD_ARCHIVE_RECORDS));
      setLoading(false);
      toast.error(getLocalToastMessage(localToastKeys.LOAD_ARCHIVE_RECORDS));
      return;
    }
    const data = (await response.json()) as PaginatedResponse<PaymentRequestExpectationDateArchive>;
    setRows(data?.items ?? []);
    setTotal(data?.total ?? 0);
    setLoading(false);
  }, [page, pageSize, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (loading && rows.length === 0 && !error) {
    return <TableSkeleton rows={6} columns={4} />;
  }

  if (error && rows.length === 0) {
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
      {total > 0 && !error && (
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

      {!error && !loading && rows.length === 0 && (
        <div className={styles.adminCard}>
          <div className={styles.adminCardContent}>
            <div className={styles.adminTextGray500}>
              {q.trim() ? `No archive records match your search` : `No archive records`}
            </div>
          </div>
        </div>
      )}

      {!error && rows.length > 0 && (
        <DataTable<PaymentRequestExpectationDateArchive>
          rows={rows}
          getRowKeyAction={(r) => r.id}
          columns={[
            {
              key: `paymentRequestId`,
              header: `Payment Request`,
              render: (r) => (
                <Link href={`/payment-requests/${r.paymentRequestId}`} className="text-blue-600 hover:text-blue-800">
                  <span className={styles.adminMonoCode}>{r.paymentRequestId}</span>
                </Link>
              ),
            },
            {
              key: `expectationDate`,
              header: `Archived Expectation Date`,
              render: (r) => (
                <span className={styles.adminTextGray700}>{new Date(r.expectationDate).toISOString()}</span>
              ),
            },
            {
              key: `archivedAt`,
              header: `Archived At`,
              render: (r) => <span className={styles.adminTextGray600}>{new Date(r.archivedAt).toLocaleString()}</span>,
            },
            {
              key: `migrationTag`,
              header: `Migration`,
              render: (r) => <span className={styles.adminMonoCode}>{r.migrationTag}</span>,
            },
            {
              key: `exists`,
              header: `Payment Request Exists`,
              render: (r) => (
                <span className={styles.adminTextGray700}>
                  {r.paymentRequestExists ? `Yes` : `No (still archived)`}
                </span>
              ),
            },
          ]}
        />
      )}
    </>
  );
}
