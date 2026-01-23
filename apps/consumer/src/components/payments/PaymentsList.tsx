'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { usePayments } from '../../lib/hooks';
import { SkeletonTable } from '../ui';
import { PaymentsFilters } from './PaymentsFilters';

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
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <div className="text-center">
          <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-3 mb-4 mx-auto w-fit">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54
              0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Failed to load payments</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-600">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-600">
                <th className="px-6 py-3">Counterparty</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-slate-500 dark:text-slate-400">
                    No payments found
                  </td>
                </tr>
              )}

              {payments.map((p: PaymentItem) => (
                <tr key={p.id} className="border-b border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{p.counterparty.email}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{p.description || `—`}</div>
                  </td>

                  <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">${p.amount.toFixed(2)}</td>

                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        p.status === `PENDING`
                          ? `bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300`
                          : p.status === `COMPLETED`
                            ? `bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300`
                            : p.status === `WAITING`
                              ? `bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300`
                              : `bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300`
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{p.type}</td>

                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>

                  <td className="px-6 py-4 text-right">
                    <Link href={`/payments/${p.id}`} className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
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
        <div className="flex justify-end gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p: number) => p - 1)}
            className="px-3 py-1 rounded-md bg-white dark:bg-slate-700 border dark:border-slate-600 shadow-sm text-gray-700 dark:text-gray-200 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p: number) => p + 1)}
            className="px-3 py-1 rounded-md bg-white dark:bg-slate-700 border dark:border-slate-600 shadow-sm text-gray-700 dark:text-gray-200 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
