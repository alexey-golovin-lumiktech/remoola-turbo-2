'use client';

import { useCallback, useState } from 'react';

import { LedgerTableBlock } from './LedgerTableBlock';
import { SearchWithClear } from '../../../components';
import styles from '../../../components/ui/classNames.module.css';
import { useDebouncedValue } from '../../../lib/client';

const DEFAULT_PAGE_SIZE = 10;
const TYPE_OPTIONS = [`USER_PAYMENT`, `USER_PAYMENT_REVERSAL`, `PLATFORM_FEE`, `PLATFORM_FEE_REVERSAL`, `USER_DEPOSIT`];
const STATUS_OPTIONS = [`DRAFT`, `WAITING`, `PENDING`, `COMPLETED`, `DENIED`, `UNCOLLECTIBLE`];

export function LedgerPageClient() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [q, setQ] = useState(``);
  const qDebounced = useDebouncedValue(q, 400);
  const [typeFilter, setTypeFilter] = useState(``);
  const [statusFilter, setStatusFilter] = useState(``);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const resetFilters = useCallback(() => {
    setQ(``);
    setTypeFilter(``);
    setStatusFilter(``);
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
          <h1 className={styles.adminPageTitle}>Ledger</h1>
          <p className={styles.adminPageSubtitle}>Ledger Entry (signed amounts, idempotencyKey, stripeId).</p>
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
            <label className={styles.adminFormLabelBlock} style={{ marginBottom: 0 }} htmlFor="ledger-search">
              <span className={styles.adminFormLabelText}>Search</span>
              <SearchWithClear
                id="ledger-search"
                name="q"
                value={q}
                onChangeAction={(v) => {
                  setQ(v);
                  setPage(1);
                }}
                placeholder="ID, ledger ID, payment request ID"
              />
            </label>
            <label className={styles.adminFormLabelBlock} style={{ marginBottom: 0 }} htmlFor="ledger-type-filter">
              <span className={styles.adminFormLabelText}>Type</span>
              <select
                id="ledger-type-filter"
                name="typeFilter"
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
            <label className={styles.adminFormLabelBlock} style={{ marginBottom: 0 }} htmlFor="ledger-status-filter">
              <span className={styles.adminFormLabelText}>Status</span>
              <select
                id="ledger-status-filter"
                name="statusFilter"
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
            <div className={styles.adminFilterLine1Actions}>
              <button type="button" className={styles.adminPrimaryButton} onClick={resetFilters}>
                Reset
              </button>
            </div>
          </div>
          <div className={styles.adminFilterCheckboxesRow}>
            <div className={styles.adminFilterCheckboxes}>
              <label className={styles.adminCheckboxLabel} style={{ marginBottom: 0 }} htmlFor="ledger-include-deleted">
                <input
                  id="ledger-include-deleted"
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

      <LedgerTableBlock
        page={page}
        pageSize={pageSize}
        onPageChangeAction={setPage}
        q={qDebounced}
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        includeDeleted={includeDeleted}
        refreshKey={refreshKey}
      />
    </div>
  );
}
