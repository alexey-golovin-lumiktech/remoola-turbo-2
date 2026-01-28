'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { usePayments } from '../../lib/hooks';
import { SkeletonTable } from '../ui';
import { PaymentsFilters } from './PaymentsFilters';
import styles from '../ui/classNames.module.css';

const {
  badgeBase,
  badgeCompleted,
  badgeDefault,
  badgePending,
  badgeWaiting,
  buttonSecondary,
  cursorPointer,
  emptyStateContainer,
  emptyStateIcon,
  emptyStateIconSvg,
  flexJustifyEnd,
  gap2,
  linkPrimaryMedium,
  refreshButtonClass,
  spaceY6,
  tableBodyRow,
  tableCellBodyLg,
  tableCellHeaderLg,
  tableContainer,
  tableEmptyCell,
  tableHeaderRow,
  textCenter,
  textSm,
  textMuted,
  textMutedStrong,
  textPrimary,
  textRight,
  textSecondary,
  textXsMuted,
} = styles;

function formatAmount(amount: number, currencyCode: string) {
  return new Intl.NumberFormat(undefined, { style: `currency`, currency: currencyCode }).format(amount);
}

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

export function PaymentsList() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [status, setStatus] = useState(``);
  const [type, setType] = useState(``);
  const [search, setSearch] = useState(``);

  const queryParams = useMemo(() => {
    const params: Record<string, any> = {
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

  const totalPages = useMemo(() => Math.ceil(total / pageSize), [total, pageSize]);

  if (error) {
    return (
      <div className={emptyStateContainer}>
        <div className={textCenter}>
          <div className={emptyStateIcon}>
            <svg className={emptyStateIconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54
              0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className={`text-xl font-semibold ${textPrimary} mb-2`}>Failed to load payments</h2>
          <p className={`${textSecondary} mb-6`}>{error.message}</p>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.location.reload();
            }}
            className={refreshButtonClass}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={spaceY6}>
      <PaymentsFilters
        status={status}
        type={type}
        search={search}
        onStatusChangeAction={setStatus}
        onTypeChangeAction={setType}
        onSearchChangeAction={setSearch}
      />

      {/* List */}
      {isLoading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : (
        <div className={tableContainer}>
          <table className={`w-full ${textSm}`}>
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
                <tr key={p.id} className={`${tableBodyRow} ${cursorPointer}`}>
                  <td className={tableCellBodyLg}>
                    <div className={`font-medium ${textPrimary}`}>{p.counterparty.email}</div>
                    <div className={textXsMuted}>{p.description || `—`}</div>
                  </td>

                  <td className={`${tableCellBodyLg} font-semibold ${textPrimary}`}>
                    {formatAmount(p.amount, p.currencyCode)}
                  </td>

                  <td className={tableCellBodyLg}>
                    <span
                      className={`${badgeBase} ${
                        p.status === `PENDING`
                          ? badgePending
                          : p.status === `COMPLETED`
                            ? badgeCompleted
                            : p.status === `WAITING`
                              ? badgeWaiting
                              : badgeDefault
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>

                  <td className={`${tableCellBodyLg} ${textMutedStrong}`}>{p.type}</td>

                  <td className={`${tableCellBodyLg} ${textMuted}`}>{new Date(p.createdAt).toLocaleDateString()}</td>

                  <td className={`${tableCellBodyLg} ${textRight}`}>
                    <Link href={`/payments/${p.id}`} className={linkPrimaryMedium}>
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !isLoading && (
        <div className={`${flexJustifyEnd} ${gap2}`}>
          <button
            disabled={page <= 1}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setPage((p: number) => p - 1);
            }}
            className={buttonSecondary}
          >
            Previous
          </button>
          <button
            disabled={page >= totalPages}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setPage((p: number) => p + 1);
            }}
            className={buttonSecondary}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
