'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { DataTable, TableSkeleton, SearchWithClear } from '../../../components';
import styles from '../../../components/ui/classNames.module.css';
import { type Consumer } from '../../../lib';
import { useDebouncedValue } from '../../../lib/client';
import { getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';

const DEFAULT_PAGE_SIZE = 10;
const ACCOUNT_TYPE_OPTIONS = [``, `BUSINESS`, `CONTRACTOR`];
const CONTRACTOR_KIND_OPTIONS = [``, `ENTITY`, `INDIVIDUAL`];
const VERIFICATION_STATUS_OPTIONS = [``, `PENDING`, `APPROVED`, `MORE_INFO`, `REJECTED`, `FLAGGED`];

type PaginatedResponse = {
  items: Consumer[];
  total: number;
  page: number;
  pageSize: number;
};

export function ConsumersPageClient() {
  const [items, setItems] = useState<Consumer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [q, setQ] = useState(``);
  const qDebounced = useDebouncedValue(q, 400);
  const [accountType, setAccountType] = useState(``);
  const [contractorKind, setContractorKind] = useState(``);
  const [verificationStatus, setVerificationStatus] = useState(``);
  const [verified, setVerified] = useState(``);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams();
    params.set(`page`, String(page));
    params.set(`pageSize`, String(pageSize));
    if (qDebounced.trim()) params.set(`q`, qDebounced.trim());
    if (accountType) params.set(`accountType`, accountType);
    if (contractorKind) params.set(`contractorKind`, contractorKind);
    if (verificationStatus) params.set(`verificationStatus`, verificationStatus);
    if (verified) params.set(`verified`, verified);
    const response = await fetch(`/api/consumers?${params.toString()}`, { cache: `no-store`, credentials: `include` });
    if (!response.ok) {
      setItems([]);
      setTotal(0);
      setLoadError(getLocalToastMessage(localToastKeys.LOAD_CONSUMERS));
      setLoading(false);
      toast.error(getLocalToastMessage(localToastKeys.LOAD_CONSUMERS));
      return;
    }
    const data = (await response.json()) as PaginatedResponse;
    setItems(data.items ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, pageSize, qDebounced, accountType, contractorKind, verificationStatus, verified]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const resetFilters = useCallback(() => {
    setQ(``);
    setAccountType(``);
    setContractorKind(``);
    setVerificationStatus(``);
    setVerified(``);
    setPage(1);
  }, []);

  if (loading && items.length === 0 && !loadError) {
    return (
      <div className={styles.adminPageStack}>
        <div>
          <h1 className={styles.adminPageTitle}>Consumers</h1>
          <p className={styles.adminPageSubtitle}>Consumer + joined details (personal/org/address/google).</p>
        </div>
        <TableSkeleton rows={8} columns={5} />
      </div>
    );
  }

  if (loadError && items.length === 0) {
    return (
      <div className={styles.adminPageStack}>
        <div>
          <h1 className={styles.adminPageTitle}>Consumers</h1>
          <p className={styles.adminPageSubtitle}>Consumer + joined details (personal/org/address/google).</p>
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
          <h1 className={styles.adminPageTitle}>Consumers</h1>
          <p className={styles.adminPageSubtitle}>Consumer + joined details (personal/org/address/google).</p>
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
            <div className={styles.adminTextGray500}>No consumers</div>
          </div>
        </div>
      )}

      {total > 0 && (
        <DataTable<Consumer>
          rows={items}
          getRowKeyAction={(c) => c.id}
          rowHrefAction={(c) => `/consumers/${c.id}`}
          columns={[
            {
              key: `email`,
              header: `Email`,
              render: (c) => <span className={styles.adminTextMedium}>{c.email}</span>,
            },
            {
              key: `type`,
              header: `Account`,
              render: (c) => (
                <span>
                  {c.accountType}
                  {c.contractorKind ? ` / ${c.contractorKind}` : ``}
                </span>
              ),
            },
            {
              key: `verified`,
              header: `Verified`,
              render: (c) => <span>{String(c.verified ?? false)}</span>,
            },
            {
              key: `legal`,
              header: `Legal Verified`,
              render: (c) => <span>{String(c.legalVerified ?? false)}</span>,
            },
            {
              key: `created`,
              header: `Created`,
              render: (c) => <span className={styles.adminTextGray600}>{new Date(c.createdAt).toLocaleString()}</span>,
            },
          ]}
        />
      )}
    </div>
  );
}
