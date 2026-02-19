'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DataTable, TableSkeleton, SearchWithClear } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';
import { type PaymentRequestExpectationDateArchive } from '../../../../lib';
import { useDebouncedValue } from '../../../../lib/client';
import { getLocalToastMessage, localToastKeys } from '../../../../lib/error-messages';

export function ExpectationDateArchivePageClient() {
  const [rows, setRows] = useState<PaymentRequestExpectationDateArchive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(``);
  const qDebounced = useDebouncedValue(query, 400);
  const encodedQuery = useMemo(() => encodeURIComponent(qDebounced.trim()), [qDebounced]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const queryString = encodedQuery ? `?q=${encodedQuery}` : ``;
    const response = await fetch(`/api/payment-requests/expectation-date-archive${queryString}`, {
      cache: `no-store`,
      credentials: `include`,
    });

    if (!response.ok) {
      setRows([]);
      setError(getLocalToastMessage(localToastKeys.LOAD_ARCHIVE_RECORDS));
      setLoading(false);
      toast.error(getLocalToastMessage(localToastKeys.LOAD_ARCHIVE_RECORDS));
      return;
    }

    const data = (await response.json()) as PaymentRequestExpectationDateArchive[];
    setRows(data);
    setLoading(false);
  }, [encodedQuery]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className={styles.adminPageStack}>
      <div className={styles.adminHeaderRow}>
        <div>
          <h1 className={styles.adminPageTitle}>Expectation Date Archive</h1>
          <p className={styles.adminPageSubtitle}>
            Archived values copied from removed `payment_request.expectation_date`.
          </p>
        </div>
        <div className={styles.adminHeaderActions}>
          <button type="button" className={styles.adminPrimaryButton} onClick={() => void load()} disabled={loading}>
            {loading ? `Refreshing...` : `Refresh`}
          </button>
          <Link href="/payment-requests" className={styles.adminPrimaryButton}>
            Payment requests
          </Link>
        </div>
      </div>

      <div className={styles.adminActionRow}>
        <label className={styles.adminFormLabelBlock} style={{ marginBottom: 0 }}>
          <span className={styles.adminFormLabelText}>Search</span>
          <SearchWithClear value={query} onChangeAction={setQuery} placeholder="Filter by payment request ID" />
        </label>
        <button type="button" className={styles.adminPrimaryButton} onClick={() => setQuery(``)} disabled={loading}>
          Reset filters
        </button>
      </div>

      {error && (
        <div className={styles.adminCard}>
          <div className={styles.adminCardContent}>
            <button type="button" className={styles.adminPrimaryButton} onClick={() => void load()}>
              Retry
            </button>
          </div>
        </div>
      )}

      {!error && loading && rows.length === 0 && <TableSkeleton rows={6} columns={4} />}

      {!error && !loading && rows.length === 0 && (
        <div className={styles.adminCard}>
          <div className={styles.adminCardContent}>
            <div className={styles.adminTextGray500}>
              {query.trim() ? `No archive records match your search` : `No archive records`}
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
    </div>
  );
}
