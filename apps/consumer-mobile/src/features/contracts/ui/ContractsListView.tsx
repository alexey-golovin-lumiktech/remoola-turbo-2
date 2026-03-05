'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Avatar } from '../../../shared/ui/Avatar';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { StatusBadge } from '../../../shared/ui/StatusBadge';

import type { Contract } from '../schemas';

interface ContractsListViewProps {
  contracts: Contract[];
  total: number;
}

function formatDate(dateStr: string | Date | null): string {
  if (!dateStr) return `—`;
  const date = typeof dateStr === `string` ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString(undefined, {
    year: `numeric`,
    month: `short`,
    day: `numeric`,
  });
}

export function ContractsListView({ contracts, total }: ContractsListViewProps) {
  const [searchQuery, setSearchQuery] = useState(``);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredContracts = useMemo(() => {
    if (!searchQuery) return contracts;
    const query = searchQuery.toLowerCase();
    return contracts.filter(
      (c) =>
        c.name?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query) ||
        c.id?.toLowerCase().includes(query),
    );
  }, [contracts, searchQuery]);

  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage);
  const paginatedContracts = filteredContracts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (contracts.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        }
        title="No contracts yet"
        description="Your contractor relationships will appear here once you start making payments."
      />
    );
  }

  return (
    <div className="space-y-6" data-testid="consumer-mobile-contracts-list">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Contracts</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {total} {total === 1 ? `contractor` : `contractors`}
          </p>
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="search"
          placeholder="Search contractors..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="input w-full pl-10"
        />
      </div>

      {filteredContracts.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No contractors found matching &quot;{searchQuery}&quot;
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {paginatedContracts.map((contract) => (
              <div
                key={contract.id}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={contract.name} email={contract.email} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900 dark:text-white">{contract.name}</p>
                          <p className="truncate text-sm text-slate-600 dark:text-slate-400">{contract.email}</p>
                        </div>
                        {contract.lastStatus && (
                          <div className="shrink-0">
                            <StatusBadge status={contract.lastStatus} />
                          </div>
                        )}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-500">Last Activity</p>
                          <p className="mt-0.5 font-medium text-slate-700 dark:text-slate-300">
                            {formatDate(contract.lastActivity)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-500">Documents</p>
                          <p className="mt-0.5 font-medium text-slate-700 dark:text-slate-300">{contract.docs}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {contract.lastRequestId && (
                  <div className="border-t border-slate-200 dark:border-slate-700">
                    <Link
                      href={`/payments/${contract.lastRequestId}`}
                      className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/10"
                    >
                      <span>View Latest Payment</span>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                )}

                {!contract.lastRequestId && (
                  <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                    No payments yet
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-700">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{` `}
                {Math.min(currentPage * itemsPerPage, filteredContracts.length)} of {filteredContracts.length}
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex min-h-[36px] items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex min-h-[36px] items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
