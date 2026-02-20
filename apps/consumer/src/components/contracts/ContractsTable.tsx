'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { formatDateForDisplay } from '../../lib/date-utils';
import { type ConsumerContractItem } from '../../types';
import { ErrorState, PaginationBar } from '../ui';
import styles from '../ui/classNames.module.css';

const DEFAULT_PAGE_SIZE = 10;

const {
  cardBaseSoftCompact,
  emptyStateText,
  linkPrimary,
  tableBodyRowMutedStrong,
  tableCellBodySimple,
  tableCellHeaderSimple,
  tableHeaderRowMutedAlt,
  textCapitalize,
  textMutedGrayAlt,
  textMutedSlate,
  textPrimary,
  textRight,
  textSm,
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
      <div className={cardBaseSoftCompact} data-testid="consumer-contracts-table-wrap">
        <table className={`w-full ${textSm}`} data-testid="consumer-contracts-table">
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
            {(!contracts || contracts.length === 0) && (
              <tr>
                <td colSpan={5} className={emptyStateText}>
                  You have no contractors yet.
                </td>
              </tr>
            )}

            {contracts.map((row) => (
              <tr key={row.id} className={tableBodyRowMutedStrong}>
                <td className={`${tableCellBodySimple} ${textPrimary}`}>{row.name}</td>
                <td className={`${textCapitalize} ${textMutedGrayAlt}`}>{row.lastStatus ?? `—`}</td>
                <td className={textMutedGrayAlt}>{row.lastActivity ? formatDateForDisplay(row.lastActivity) : `—`}</td>
                <td className={textMutedGrayAlt}>{row.docs}</td>
                <td className={textRight}>
                  {row.lastRequestId ? (
                    <Link href={`/payments/${row.lastRequestId}`} className={linkPrimary}>
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
      {total > 0 && (
        <PaginationBar total={total} page={page} pageSize={pageSize} onPageChange={setPage} loading={loading} />
      )}
    </>
  );
}
