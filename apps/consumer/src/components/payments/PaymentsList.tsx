'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { TRANSACTION_STATUS } from '@remoola/api-types';
import { cn } from '@remoola/ui';

import { formatCurrencyDisplay } from '../../lib/currency';
import { formatDateForDisplay } from '../../lib/date-utils';
import { usePayments } from '../../lib/hooks';
import { ErrorState, PaginationBar, SkeletonTable } from '../ui';
import { PaymentsFilters } from './PaymentsFilters';
import localStyles from './PaymentsList.module.css';
import shared from '../ui/classNames.module.css';

const {
  badgeBase,
  badgeCompleted,
  badgeDefault,
  badgePending,
  badgeWaiting,
  linkPrimaryMedium,
  tableBodyRow,
  tableCellBodyLg,
  tableCellHeaderLg,
  tableContainer,
  tableEmptyCell,
  tableHeaderRow,
  textMuted,
  textMutedStrong,
  textXsMuted,
} = shared;

type PaymentItem = {
  id: string;
  amount: number;
  currencyCode: string;
  status: string;
  type: string;
  description: string | null;
  createdAt: string;
  counterparty: { id: string; email: string };
  latestTransaction?: {
    id: string;
    status: string;
    createdAt: string;
  };
};

// Type is inferred from the hook, no need to define separately

function getStatusBadgeClassName(status: string) {
  return cn(
    badgeBase,
    status === TRANSACTION_STATUS.PENDING
      ? badgePending
      : status === TRANSACTION_STATUS.COMPLETED
        ? badgeCompleted
        : status === TRANSACTION_STATUS.WAITING
          ? badgeWaiting
          : badgeDefault,
  );
}

export function PaymentsList() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [status, setStatus] = useState(``);
  const [type, setType] = useState(``);
  const [search, setSearch] = useState(``);

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      page: page.toString(),
      pageSize: pageSize.toString(),
    };

    if (status) params.status = status;
    if (type) params.type = type;
    if (search) params.search = search;

    return params;
  }, [page, status, type, search]);

  const { data, error, isLoading } = usePayments(queryParams);

  const payments = data?.items || [];
  const total = data?.total || 0;
  const handleRetry = () => window.location.reload();

  if (error) {
    return <ErrorState title="Failed to load payments" message={error.message} onRetry={handleRetry} />;
  }

  return (
    <div className={localStyles.listRoot} data-testid="consumer-payments-list">
      <PaymentsFilters
        status={status}
        type={type}
        search={search}
        onStatusChangeAction={setStatus}
        onTypeChangeAction={setType}
        onSearchChangeAction={setSearch}
      />

      {/* Pagination */}
      {total > 0 && (
        <PaginationBar total={total} page={page} pageSize={pageSize} onPageChange={setPage} loading={isLoading} />
      )}

      {/* List */}
      {isLoading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : (
        <>
          <div className={localStyles.mobileList} data-testid="consumer-payments-mobile-list">
            {payments.length === 0 ? (
              <div className={localStyles.mobileEmptyState}>No payments found</div>
            ) : (
              payments.map((p: PaymentItem) => (
                <article key={p.id} className={localStyles.mobileCard}>
                  <div className={localStyles.mobileHeader}>
                    <div>
                      <div className={localStyles.counterpartyPrimary}>{p.counterparty.email}</div>
                      <div className={localStyles.mobileDescription}>{p.description || `No description`}</div>
                    </div>
                    <div className={localStyles.mobileAmount}>{formatCurrencyDisplay(p.amount, p.currencyCode)}</div>
                  </div>

                  <div className={localStyles.mobileMetaGrid}>
                    <div>
                      <div className={localStyles.mobileMetaLabel}>Status</div>
                      <span className={getStatusBadgeClassName(p.status)}>{p.status}</span>
                    </div>
                    <div>
                      <div className={localStyles.mobileMetaLabel}>Type</div>
                      <div className={textMutedStrong}>{p.type}</div>
                    </div>
                    <div>
                      <div className={localStyles.mobileMetaLabel}>Date</div>
                      <div className={textMuted}>{formatDateForDisplay(p.createdAt)}</div>
                    </div>
                  </div>

                  <Link href={`/payments/${p.id}`} className={localStyles.mobileViewLink}>
                    View payment
                  </Link>
                </article>
              ))
            )}
          </div>

          <div className={localStyles.desktopTableWrapper} data-testid="consumer-payments-table">
            <div className={tableContainer}>
              <table className={localStyles.table}>
                <thead>
                  <tr className={tableHeaderRow}>
                    <th className={tableCellHeaderLg}>Counterparty</th>
                    <th className={tableCellHeaderLg}>Amount</th>
                    <th className={tableCellHeaderLg}>Status</th>
                    <th className={tableCellHeaderLg}>Type</th>
                    <th className={tableCellHeaderLg}>Date</th>
                    <th className={tableCellHeaderLg}></th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={6} className={tableEmptyCell}>
                        No payments found
                      </td>
                    </tr>
                  )}

                  {payments.map((p: PaymentItem) => (
                    <tr key={p.id} className={cn(tableBodyRow, localStyles.rowClickable)}>
                      <td className={tableCellBodyLg}>
                        <div className={localStyles.counterpartyPrimary}>{p.counterparty.email}</div>
                        <div className={textXsMuted}>{p.description || `—`}</div>
                      </td>

                      <td className={cn(tableCellBodyLg, localStyles.amountCell)}>
                        {formatCurrencyDisplay(p.amount, p.currencyCode)}
                      </td>

                      <td className={tableCellBodyLg}>
                        <span className={getStatusBadgeClassName(p.status)}>{p.status}</span>
                      </td>

                      <td className={cn(tableCellBodyLg, textMutedStrong)}>{p.type}</td>

                      <td className={cn(tableCellBodyLg, textMuted)}>{formatDateForDisplay(p.createdAt)}</td>

                      <td className={cn(tableCellBodyLg, localStyles.cellRight)}>
                        <Link href={`/payments/${p.id}`} className={linkPrimaryMedium}>
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
