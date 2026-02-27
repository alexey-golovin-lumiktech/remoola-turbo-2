'use client';

import { useCallback, useState } from 'react';

import { PaymentRequestsTableBlock } from './PaymentRequestsTableBlock';
import { SearchWithClear } from '../../../components';
import styles from '../../../components/ui/classNames.module.css';
import { useDebouncedValue } from '../../../lib/client';

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

export function PaymentRequestsPageClient() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [q, setQ] = useState(``);
  const qDebounced = useDebouncedValue(q, 400);
  const [status, setStatus] = useState(``);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const resetFilters = useCallback(() => {
    setQ(``);
    setStatus(``);
    setIncludeDeleted(false);
    setPage(1);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className={styles.adminPageStack}>
      <div className={styles.adminHeaderRow}>
        <div>
          <h1 className={styles.adminPageTitle}>Payment Requests</h1>
          <p className={styles.adminPageSubtitle}>Payment Request (payer/requester, status, rail, dates).</p>
        </div>
        <div className={styles.adminActionRow}>
          <button type="button" className={styles.adminPrimaryButton} onClick={handleRefresh}>
            Refresh
          </button>
        </div>
      </div>

      <div className={styles.adminCard}>
        <div className={styles.adminCardContent}>
          <div className={styles.adminFilterRow}>
            <label className={styles.adminFormLabelBlock} style={{ marginBottom: 0 }} htmlFor="payment-requests-search">
              <span className={styles.adminFormLabelText}>Search</span>
              <SearchWithClear
                id="payment-requests-search"
                name="q"
                value={q}
                onChangeAction={(v) => {
                  setQ(v);
                  setPage(1);
                }}
                placeholder="ID, description, payer or requester email"
              />
            </label>
            <label className={styles.adminFormLabelBlock} style={{ marginBottom: 0 }} htmlFor="payment-requests-status">
              <span className={styles.adminFormLabelText}>Status</span>
              <select
                id="payment-requests-status"
                name="status"
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
            <div className={styles.adminFilterLine1Actions}>
              <button type="button" className={styles.adminPrimaryButton} onClick={resetFilters}>
                Reset
              </button>
            </div>
          </div>
          <div className={styles.adminFilterCheckboxesRow}>
            <div className={styles.adminFilterCheckboxes}>
              <label
                className={styles.adminCheckboxLabel}
                style={{ marginBottom: 0 }}
                htmlFor="payment-requests-include-deleted"
              >
                <input
                  id="payment-requests-include-deleted"
                  name="includeDeleted"
                  type="checkbox"
                  checked={includeDeleted}
                  onChange={(e) => {
                    setIncludeDeleted(e.target.checked);
                    setPage(1);
                  }}
                  className={styles.adminCheckbox}
                />
                Include deleted
              </label>
            </div>
          </div>
        </div>
      </div>

      <PaymentRequestsTableBlock
        page={page}
        pageSize={pageSize}
        onPageChangeAction={setPage}
        q={qDebounced}
        status={status}
        includeDeleted={includeDeleted}
        refreshKey={refreshKey}
      />
    </div>
  );
}
