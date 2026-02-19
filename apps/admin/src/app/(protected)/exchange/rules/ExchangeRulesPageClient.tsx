'use client';

import { useCallback, useEffect, useState } from 'react';

import { ExchangeRulesTableBlock } from './ExchangeRulesTableBlock';
import { SearchWithClear } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';
import { useDebouncedValue } from '../../../../lib/client';

const DEFAULT_PAGE_SIZE = 10;

const {
  adminPageStack,
  adminHeaderRow,
  adminPageTitle,
  adminPageSubtitle,
  adminFormLabelBlock,
  adminFormLabelText,
  adminFormInput,
  adminCard,
  adminCardContent,
  adminPrimaryButton,
  adminFilterRow,
  adminFilterLine1Actions,
  adminFilterCheckboxesRow,
  adminFilterCheckboxes,
  adminCheckboxLabel,
  adminCheckbox,
} = styles;

export function ExchangeRulesPageClient() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [query, setQuery] = useState(``);
  const qDebounced = useDebouncedValue(query, 400);
  const [status, setStatus] = useState<`all` | `enabled` | `disabled`>(`all`);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [qDebounced, status, includeDeleted]);

  const resetFilters = useCallback(() => {
    setQuery(``);
    setStatus(`all`);
    setIncludeDeleted(false);
    setPage(1);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className={adminPageStack}>
      <div className={adminHeaderRow}>
        <div>
          <h1 className={adminPageTitle}>Exchange Rules</h1>
          <p className={adminPageSubtitle}>Review and override customer auto-conversion rules.</p>
        </div>
        <button type="button" className={adminPrimaryButton} onClick={handleRefresh}>
          Refresh
        </button>
      </div>

      <div className={adminCard}>
        <div className={adminCardContent}>
          <div className={adminFilterRow}>
            <label className={adminFormLabelBlock}>
              <span className={adminFormLabelText}>Search</span>
              <SearchWithClear value={query} onChangeAction={setQuery} placeholder="Consumer email, rule id, pair" />
            </label>
            <label className={adminFormLabelBlock}>
              <span className={adminFormLabelText}>Enabled</span>
              <select
                className={adminFormInput}
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
              >
                <option value="all">All</option>
                <option value="enabled">Yes</option>
                <option value="disabled">No</option>
              </select>
            </label>
            <div className={adminFilterLine1Actions}>
              <button type="button" className={adminPrimaryButton} onClick={resetFilters}>
                Reset
              </button>
            </div>
          </div>
          <div className={adminFilterCheckboxesRow}>
            <div className={adminFilterCheckboxes}>
              <label className={adminCheckboxLabel}>
                <input
                  type="checkbox"
                  checked={includeDeleted}
                  onChange={(e) => {
                    setIncludeDeleted(e.target.checked);
                    setPage(1);
                  }}
                  className={adminCheckbox}
                />
                Include deleted
              </label>
            </div>
          </div>
        </div>
      </div>

      <ExchangeRulesTableBlock
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
