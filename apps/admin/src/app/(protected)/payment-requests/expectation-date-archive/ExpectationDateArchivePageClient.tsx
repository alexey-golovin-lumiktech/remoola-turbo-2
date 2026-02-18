'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { DataTable } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';
import { type PaymentRequestExpectationDateArchive } from '../../../../lib';

export function ExpectationDateArchivePageClient() {
  const [rows, setRows] = useState<PaymentRequestExpectationDateArchive[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryInput, setQueryInput] = useState(``);
  const [query, setQuery] = useState(``);

  const encodedQuery = useMemo(() => encodeURIComponent(query.trim()), [query]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const queryString = encodedQuery ? `?q=${encodedQuery}` : ``;
      const response = await fetch(`/api/payment-requests/expectation-date-archive${queryString}`, {
        cache: `no-store`,
        credentials: `include`,
      });

      if (!response.ok) {
        setRows([]);
        setError(`Failed to load archive records`);
        setLoading(false);
        return;
      }

      const data = (await response.json()) as PaymentRequestExpectationDateArchive[];
      setRows(data);
      setLoading(false);
    }

    void load();
  }, [encodedQuery]);

  return (
    <div className={styles.adminPageStack}>
      <div className={styles.adminHeaderRow}>
        <div>
          <h1 className={styles.adminPageTitle}>Expectation Date Archive</h1>
          <p className={styles.adminPageSubtitle}>
            Archived values copied from removed `payment_request.expectation_date`.
          </p>
        </div>
        <Link href="/payment-requests" className={styles.adminPrimaryButton}>
          Payment requests
        </Link>
      </div>

      <form
        className={styles.adminActionRow}
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(queryInput);
        }}
      >
        <input
          className={styles.adminFormInput}
          value={queryInput}
          onChange={(event) => setQueryInput(event.target.value)}
          placeholder="Filter by payment request ID"
        />
        <button type="submit" className={styles.adminPrimaryButton} disabled={loading}>
          {loading ? `Loading...` : `Search`}
        </button>
      </form>

      {error && <div className={styles.adminAlertError}>{error}</div>}

      {!error && (
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
