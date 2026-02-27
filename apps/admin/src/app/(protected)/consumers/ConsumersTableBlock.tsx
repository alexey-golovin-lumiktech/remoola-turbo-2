'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { type TAdminConsumersListQuery } from '@remoola/api-types';

import { DataTable, TableSkeleton } from '../../../components';
import styles from '../../../components/ui/classNames.module.css';
import { type Consumer, type PaginatedResponse } from '../../../lib';
import { getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';

type ConsumersTableBlockProps = {
  page: number;
  pageSize: number;
  onPageChangeAction: (page: number) => void;
  q: string;
  accountType: string;
  contractorKind: string;
  verificationStatus: string;
  verified: string;
  includeDeleted: boolean;
  refreshKey: number;
};

export function ConsumersTableBlock({
  page,
  pageSize,
  onPageChangeAction,
  q,
  accountType,
  contractorKind,
  verificationStatus,
  verified,
  includeDeleted,
  refreshKey,
}: ConsumersTableBlockProps) {
  const [items, setItems] = useState<Consumer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const query = {
      page: String(page),
      pageSize: String(pageSize),
      ...(q.trim() && { q: q.trim() }),
      ...(accountType && { accountType }),
      ...(contractorKind && { contractorKind }),
      ...(verificationStatus && { verificationStatus }),
      ...(verified && { verified }),
      ...(includeDeleted && { includeDeleted: `true` }),
    } as Partial<TAdminConsumersListQuery>;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== ``) params.set(key, value);
    }
    const response = await fetch(`/api/consumers?${params.toString()}`, {
      cache: `no-store`,
      credentials: `include`,
    });
    if (!response.ok) {
      setItems([]);
      setTotal(0);
      setLoadError(getLocalToastMessage(localToastKeys.LOAD_CONSUMERS));
      setLoading(false);
      toast.error(getLocalToastMessage(localToastKeys.LOAD_CONSUMERS));
      return;
    }
    const data = (await response.json()) as PaginatedResponse<Consumer>;
    setItems(data.items ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshKey triggers refetch when Refresh is clicked
  }, [page, pageSize, q, accountType, contractorKind, verificationStatus, verified, includeDeleted, refreshKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (loading && items.length === 0 && !loadError) {
    return <TableSkeleton rows={8} columns={5} />;
  }

  if (loadError && items.length === 0) {
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
      {total > 0 && (
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
          {loading && items.length > 0 && (
            <span className={styles.adminTextGray500} style={{ marginLeft: `0.5rem` }}>
              Updating…
            </span>
          )}
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
        <div style={{ position: `relative` }}>
          {loading && items.length > 0 && (
            <div
              style={{
                position: `absolute`,
                inset: 0,
                background: `rgba(255,255,255,0.5)`,
                display: `flex`,
                alignItems: `center`,
                justifyContent: `center`,
                zIndex: 1,
                pointerEvents: `none`,
              }}
              aria-hidden
            >
              <span className={styles.adminTextGray500}>Updating table…</span>
            </div>
          )}
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
                render: (c) => (
                  <span className={styles.adminTextGray600}>{new Date(c.createdAt).toLocaleString()}</span>
                ),
              },
            ]}
          />
        </div>
      )}
    </>
  );
}
