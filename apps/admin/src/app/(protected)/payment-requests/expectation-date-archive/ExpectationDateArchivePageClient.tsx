'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { ExpectationDateArchiveTableBlock } from './ExpectationDateArchiveTableBlock';
import { SearchWithClear } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';
import { useDebouncedValue } from '../../../../lib/client';

const DEFAULT_PAGE_SIZE = 10;

export function ExpectationDateArchivePageClient() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [query, setQuery] = useState(``);
  const qDebounced = useDebouncedValue(query, 400);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [qDebounced]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

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
          <button type="button" className={styles.adminPrimaryButton} onClick={handleRefresh}>
            Refresh
          </button>
          <Link href="/payment-requests" className={styles.adminPrimaryButton}>
            Payment requests
          </Link>
        </div>
      </div>

      <div className={styles.adminCard}>
        <div className={styles.adminCardContent}>
          <div className={styles.adminFilterRow}>
            <label className={styles.adminFormLabelBlock}>
              <span className={styles.adminFormLabelText}>Search</span>
              <SearchWithClear value={query} onChangeAction={setQuery} placeholder="Filter by payment request ID" />
            </label>
            <div className={styles.adminFilterLine1Actions}>
              <button
                type="button"
                className={styles.adminPrimaryButton}
                onClick={() => {
                  setQuery(``);
                  setPage(1);
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <ExpectationDateArchiveTableBlock
        page={page}
        pageSize={pageSize}
        onPageChangeAction={setPage}
        q={qDebounced}
        refreshKey={refreshKey}
      />
    </div>
  );
}
