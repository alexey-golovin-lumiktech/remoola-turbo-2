'use client';

import { useCallback, useState } from 'react';

import { ConsumersTableBlock } from './ConsumersTableBlock';
import { SearchWithClear } from '../../../components';
import styles from '../../../components/ui/classNames.module.css';
import { useDebouncedValue } from '../../../lib/client';

const DEFAULT_PAGE_SIZE = 10;
const ACCOUNT_TYPE_OPTIONS = [``, `BUSINESS`, `CONTRACTOR`];
const CONTRACTOR_KIND_OPTIONS = [``, `ENTITY`, `INDIVIDUAL`];
const VERIFICATION_STATUS_OPTIONS = [``, `PENDING`, `APPROVED`, `MORE_INFO`, `REJECTED`, `FLAGGED`];

export function ConsumersPageClient() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [q, setQ] = useState(``);
  const qDebounced = useDebouncedValue(q, 400);
  const [accountType, setAccountType] = useState(``);
  const [contractorKind, setContractorKind] = useState(``);
  const [verificationStatus, setVerificationStatus] = useState(``);
  const [verified, setVerified] = useState(``);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const resetFilters = useCallback(() => {
    setQ(``);
    setAccountType(``);
    setContractorKind(``);
    setVerificationStatus(``);
    setVerified(``);
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
          <h1 className={styles.adminPageTitle}>Consumers</h1>
          <p className={styles.adminPageSubtitle}>Consumer + joined details (personal/org/address/google).</p>
        </div>
        <button type="button" className={styles.adminPrimaryButton} onClick={handleRefresh}>
          Refresh
        </button>
      </div>

      <div className={styles.adminCard}>
        <div className={styles.adminCardContent}>
          <div className={styles.adminFilterRow}>
            <label className={styles.adminFormLabelBlock} style={{ marginBottom: 0 }}>
              <span className={styles.adminFormLabelText}>Search</span>
              <SearchWithClear
                value={q}
                onChangeAction={(v) => {
                  setQ(v);
                  setPage(1);
                }}
                placeholder="Email"
              />
            </label>
            <label className={styles.adminFormLabelBlock} style={{ marginBottom: 0 }}>
              <span className={styles.adminFormLabelText}>Account type</span>
              <select
                className={styles.adminFormInput}
                value={accountType}
                onChange={(e) => {
                  const v = e.target.value;
                  setAccountType(v);
                  if (v !== `CONTRACTOR`) setContractorKind(``);
                  setPage(1);
                }}
              >
                <option value="">All</option>
                {ACCOUNT_TYPE_OPTIONS.filter(Boolean).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.adminFormLabelBlock} style={{ marginBottom: 0 }}>
              <span className={styles.adminFormLabelText}>Contractor Kind</span>
              <select
                className={styles.adminFormInput}
                value={contractorKind}
                onChange={(e) => {
                  setContractorKind(e.target.value);
                  setPage(1);
                }}
                disabled={accountType !== `CONTRACTOR`}
                title={
                  accountType !== `CONTRACTOR`
                    ? `Select Account type CONTRACTOR to filter by Contractor Kind`
                    : undefined
                }
              >
                <option value="">All</option>
                {CONTRACTOR_KIND_OPTIONS.filter(Boolean).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.adminFormLabelBlock} style={{ marginBottom: 0 }}>
              <span className={styles.adminFormLabelText}>Verification</span>
              <select
                className={styles.adminFormInput}
                value={verificationStatus}
                onChange={(e) => {
                  setVerificationStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All</option>
                {VERIFICATION_STATUS_OPTIONS.filter(Boolean).map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ` `)}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.adminFormLabelBlock} style={{ marginBottom: 0 }}>
              <span className={styles.adminFormLabelText}>Verified</span>
              <select
                className={styles.adminFormInput}
                value={verified}
                onChange={(e) => {
                  setVerified(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
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
              <label className={styles.adminCheckboxLabel} style={{ marginBottom: 0 }}>
                <input
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

      <ConsumersTableBlock
        page={page}
        pageSize={pageSize}
        onPageChangeAction={setPage}
        q={qDebounced}
        accountType={accountType}
        contractorKind={contractorKind}
        verificationStatus={verificationStatus}
        verified={verified}
        includeDeleted={includeDeleted}
        refreshKey={refreshKey}
      />
    </div>
  );
}
