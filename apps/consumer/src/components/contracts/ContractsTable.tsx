'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { formatDateForDisplay } from '../../lib/date-utils';
import { type ConsumerContractItem } from '../../types';
import { ErrorState, PaginationBar, SkeletonTable } from '../ui';
import localStyles from './ContractsTable.module.css';
import styles from '../ui/classNames.module.css';

const DEFAULT_PAGE_SIZE = 10;

const {
  emptyStateText,
  tableBodyRowMutedStrong,
  tableCellHeaderSimple,
  tableHeaderRowMutedAlt,
  textMutedGrayAlt,
  textMutedSlate,
} = styles;

export function ContractsTable() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [contracts, setContracts] = useState<ConsumerContractItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadContracts = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    const response = await fetch(`/api/contracts?${params}`, {
      method: `GET`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
      cache: `no-store`,
    });
    setLoading(false);
    if (!response.ok) {
      setLoadError(`Failed to load contracts`);
      return;
    }
    const json = await response.json();
    setContracts(json.items ?? []);
    setTotal(Number(json?.total ?? 0));
  }, [page, pageSize]);

  useEffect(() => {
    void loadContracts();
  }, [loadContracts]);

  if (loadError) {
    return <ErrorState title="Failed to load contracts" message={loadError} onRetry={() => void loadContracts()} />;
  }

  return (
    <>
      {total > 0 && (
        <PaginationBar
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          loading={loading}
          showPageInfo={false}
        />
      )}

      {loading ? (
        <SkeletonTable rows={8} cols={5} />
      ) : (
        <>
          <div className={localStyles.mobileList} data-testid="consumer-contracts-mobile-list">
            {contracts.length === 0 && <div className={localStyles.mobileEmptyState}>You have no contractors yet.</div>}

            {contracts.map((row) => (
              <article key={row.id} className={localStyles.mobileCard}>
                <div className={localStyles.mobileHeader}>
                  <div className={localStyles.mobileIdentity}>
                    <div className={localStyles.mobileName}>{getContractDisplayName(row)}</div>
                    <div className={localStyles.mobileEmail}>{row.email}</div>
                  </div>
                </div>

                <div className={localStyles.mobileMetaGrid}>
                  <div>
                    <div className={localStyles.mobileMetaLabel}>Status</div>
                    {row.lastStatus ? (
                      <div className={localStyles.mobileStatusBadge}>{row.lastStatus}</div>
                    ) : (
                      <div className={localStyles.mobileMetaValue}>No recent status</div>
                    )}
                  </div>
                  <div>
                    <div className={localStyles.mobileMetaLabel}>Last activity</div>
                    <div className={localStyles.mobileMetaValue}>
                      {row.lastActivity ? formatDateForDisplay(row.lastActivity) : `—`}
                    </div>
                  </div>
                  <div>
                    <div className={localStyles.mobileMetaLabel}>Documents</div>
                    <div className={localStyles.mobileMetaValue}>{row.docs}</div>
                  </div>
                </div>

                {row.lastRequestId ? (
                  <Link href={`/payments/${row.lastRequestId}`} className={localStyles.mobileViewLink}>
                    View latest payment
                  </Link>
                ) : (
                  <div className={localStyles.mobileNoPayments}>No payments</div>
                )}
              </article>
            ))}
          </div>

          <div className={localStyles.desktopTableWrapper} data-testid="consumer-contracts-table-wrap">
            <table className={localStyles.table} data-testid="consumer-contracts-table">
              <thead>
                <tr className={tableHeaderRowMutedAlt}>
                  <th className={tableCellHeaderSimple}>Contractor</th>
                  <th>Status</th>
                  <th>Last activity</th>
                  <th>Documents</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {contracts.length === 0 && (
                  <tr>
                    <td colSpan={5} className={emptyStateText}>
                      You have no contractors yet.
                    </td>
                  </tr>
                )}

                {contracts.map((row) => (
                  <tr key={row.id} className={tableBodyRowMutedStrong}>
                    <td className={localStyles.contractorCell}>{row.name}</td>
                    <td className={localStyles.statusCell}>{row.lastStatus ?? `—`}</td>
                    <td className={textMutedGrayAlt}>
                      {row.lastActivity ? formatDateForDisplay(row.lastActivity) : `—`}
                    </td>
                    <td className={textMutedGrayAlt}>{row.docs}</td>
                    <td className={localStyles.viewLinkCell}>
                      {row.lastRequestId ? (
                        <Link href={`/payments/${row.lastRequestId}`} className={localStyles.viewLink}>
                          View
                        </Link>
                      ) : (
                        <span className={textMutedSlate}>No payments</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function getContractDisplayName(row: ConsumerContractItem) {
  const name = row.name.trim();
  if (!name || name.toLowerCase() === row.email.trim().toLowerCase()) {
    return `No name provided`;
  }
  return name;
}
