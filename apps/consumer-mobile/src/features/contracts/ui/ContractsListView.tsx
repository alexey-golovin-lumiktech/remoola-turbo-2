'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Avatar } from '../../../shared/ui/Avatar';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { IconBadge } from '../../../shared/ui/IconBadge';
import { CalendarIcon } from '../../../shared/ui/icons/CalendarIcon';
import { CheckIcon } from '../../../shared/ui/icons/CheckIcon';
import { ChevronRightIcon } from '../../../shared/ui/icons/ChevronRightIcon';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { SearchIcon } from '../../../shared/ui/icons/SearchIcon';
import { UsersIcon } from '../../../shared/ui/icons/UsersIcon';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { SearchInput } from '../../../shared/ui/SearchInput';
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
        icon={<DocumentIcon className={`h-8 w-8`} />}
        title="No contracts yet"
        description="Your contractor relationships will appear here once you start making payments."
      />
    );
  }

  return (
    <div
      className={`
      min-h-full
      bg-gradient-to-br
      from-slate-50
      via-white
      to-slate-50
      dark:from-slate-950
      dark:via-slate-900
      dark:to-slate-950
    `}
    >
      <PageHeader
        icon={<IconBadge icon={<UsersIcon className={`h-6 w-6 text-white`} />} hasRing />}
        title="Contracts"
        subtitle={`${total} ${total === 1 ? `contractor` : `contractors`}`}
      />

      <div
        className={`
          mx-auto
          max-w-6xl
          px-4
          pt-6
          pb-6
          sm:px-6
          sm:pt-8
          lg:px-8
          space-y-5
          animate-fadeIn
        `}
        data-testid="consumer-mobile-contracts-list"
      >
        <SearchInput
          value={searchQuery}
          onChange={(value) => {
            setSearchQuery(value);
            setCurrentPage(1);
          }}
          onClear={() => setCurrentPage(1)}
          placeholder="Search contractors..."
        />

        {filteredContracts.length === 0 ? (
          <div
            className={`
            animate-fadeIn
            rounded-2xl
            border-2
            border-dashed
            border-slate-300
            bg-gradient-to-br
            from-slate-50
            to-white
            px-6
            py-16
            text-center
            shadow-inner
            dark:border-slate-700
            dark:from-slate-800/50
            dark:to-slate-900/50
          `}
          >
            <div
              className={`
              mx-auto
              mb-6
              flex
              h-20
              w-20
              items-center
              justify-center
              rounded-3xl
              bg-gradient-to-br
              from-slate-100
              to-slate-200
              text-slate-400
              shadow-lg
              ring-8
              ring-slate-100/50
              dark:from-slate-700
              dark:to-slate-800
              dark:text-slate-500
              dark:ring-slate-800/50
            `}
            >
              <SearchIcon className={`h-10 w-10`} strokeWidth={1.5} />
            </div>
            <h3
              className={`
              text-xl
              font-bold
              text-slate-900
              dark:text-white
            `}
            >
              No contractors found
            </h3>
            <p
              className={`
              mt-3
              max-w-sm
              mx-auto
              text-base
              text-slate-600
              dark:text-slate-400
            `}
            >
              No results matching &quot;{searchQuery}&quot;. Try adjusting your search.
            </p>
          </div>
        ) : (
          <>
            <div className={`space-y-3`}>
              {paginatedContracts.map((contract, index) => (
                <div
                  key={contract.id}
                  className={`
                    group
                    overflow-hidden
                    rounded-2xl
                    border
                    border-slate-700
                    bg-slate-800/90
                    shadow-lg
                    transition-all
                    duration-300
                    hover:bg-slate-800
                    hover:shadow-xl
                    hover:scale-[1.01]
                    dark:border-slate-700
                    dark:bg-slate-800/90
                    animate-fadeIn
                  `}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`p-4`}>
                    <div className={`flex items-start gap-4`}>
                      <div className={`relative`}>
                        <Avatar name={contract.name} email={contract.email} size="lg" />
                        {contract.lastStatus === `completed` && (
                          <div
                            className={`
                            absolute
                            -bottom-1
                            -right-1
                            flex
                            h-6
                            w-6
                            items-center
                            justify-center
                            rounded-full
                            bg-green-500
                            ring-2
                            ring-slate-800
                          `}
                          >
                            <CheckIcon className={`h-3.5 w-3.5 text-white`} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <div className={`min-w-0 flex-1`}>
                        <div
                          className={`
                          flex
                          items-start
                          justify-between
                          gap-2
                          mb-2
                        `}
                        >
                          <div className={`min-w-0 flex-1`}>
                            <h3
                              className={`
                              truncate
                              text-lg
                              font-bold
                              text-slate-100
                              group-hover:text-white
                              transition-colors
                            `}
                            >
                              {contract.name}
                            </h3>
                            <p
                              className={`
                              truncate
                              text-sm
                              font-medium
                              text-slate-400
                            `}
                            >
                              {contract.email}
                            </p>
                          </div>
                          {contract.lastStatus && (
                            <div className={`shrink-0`}>
                              <StatusBadge status={contract.lastStatus} />
                            </div>
                          )}
                        </div>

                        <div
                          className={`
                          mt-3
                          grid
                          grid-cols-2
                          gap-2.5
                        `}
                        >
                          <div
                            className={`
                            rounded-xl
                            bg-slate-900/50
                            px-3
                            py-2.5
                            border
                            border-slate-700/50
                            transition-colors
                            group-hover:border-slate-600
                          `}
                          >
                            <div
                              className={`
                              flex
                              items-center
                              gap-1.5
                              mb-1
                            `}
                            >
                              <CalendarIcon className={`h-3.5 w-3.5 text-slate-500`} />
                              <p className={`text-xs font-semibold text-slate-400`}>Last Activity</p>
                            </div>
                            <p className={`text-sm font-bold text-slate-200`}>{formatDate(contract.lastActivity)}</p>
                          </div>
                          <div
                            className={`
                            rounded-xl
                            bg-slate-900/50
                            px-3
                            py-2.5
                            border
                            border-slate-700/50
                            transition-colors
                            group-hover:border-slate-600
                          `}
                          >
                            <div
                              className={`
                              flex
                              items-center
                              gap-1.5
                              mb-1
                            `}
                            >
                              <DocumentIcon className={`h-3.5 w-3.5 text-slate-500`} />
                              <p className={`text-xs font-semibold text-slate-400`}>Documents</p>
                            </div>
                            <p className={`text-sm font-bold text-slate-200`}>{contract.docs}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {contract.lastRequestId && (
                    <div className={`border-t border-slate-700`}>
                      <Link
                        href={`/payments/${contract.lastRequestId}`}
                        className={`
                          flex
                          items-center
                          justify-center
                          gap-2
                          px-4
                          py-3.5
                          text-sm
                          font-bold
                          text-primary-400
                          transition-all
                          hover:bg-primary-900/20
                          hover:text-primary-300
                          active:scale-[0.98]
                        `}
                      >
                        <span>View Latest Payment</span>
                        <ChevronRightIcon
                          className={`
                            h-4
                            w-4
                            transition-transform
                            group-hover:translate-x-0.5
                          `}
                          strokeWidth={2.5}
                        />
                      </Link>
                    </div>
                  )}

                  {!contract.lastRequestId && (
                    <div
                      className={`
                      border-t
                      border-slate-700
                      bg-slate-900/30
                      px-4
                      py-3
                      text-center
                    `}
                    >
                      <p className={`text-sm font-semibold text-slate-500`}>No payments yet</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div
                className={`
                flex
                items-center
                justify-between
                rounded-xl
                border
                border-slate-700
                bg-slate-800/50
                px-4
                py-3
              `}
              >
                <p className={`text-sm font-medium text-slate-400`}>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{` `}
                  {Math.min(currentPage * itemsPerPage, filteredContracts.length)} of {filteredContracts.length}
                </p>

                <div className={`flex items-center gap-2`}>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`
                    inline-flex
                    min-h-[40px]
                    items-center
                    rounded-xl
                    border
                    border-slate-700
                    bg-slate-800
                    px-3
                    py-2
                    text-sm
                    font-semibold
                    text-slate-300
                    transition-all
                    hover:bg-slate-700
                    active:scale-95
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  `}
                  >
                    Previous
                  </button>
                  <span className={`text-sm font-medium text-slate-400`}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`
                    inline-flex
                    min-h-[40px]
                    items-center
                    rounded-xl
                    border
                    border-slate-700
                    bg-slate-800
                    px-3
                    py-2
                    text-sm
                    font-semibold
                    text-slate-300
                    transition-all
                    hover:bg-slate-700
                    active:scale-95
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                  `}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
