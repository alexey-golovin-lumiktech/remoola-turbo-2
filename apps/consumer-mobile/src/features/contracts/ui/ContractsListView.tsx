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
import { type Contract } from '../schemas';
import styles from './ContractsListView.module.css';

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

  return (
    <div className={styles.pageBg}>
      <PageHeader
        icon={<IconBadge icon={<UsersIcon className={styles.iconWhite} />} hasRing />}
        title="Contracts"
        subtitle={`${total} ${total === 1 ? `contractor` : `contractors`}`}
      />

      <div className={styles.main} data-testid="consumer-mobile-contracts-list">
        {contracts.length === 0 ? (
          <EmptyState
            icon={<DocumentIcon className={styles.emptyIcon} />}
            title="No contracts yet"
            description="Your contractor relationships will appear here once you start making payments."
          />
        ) : null}

        {contracts.length > 0 ? (
          <SearchInput
            value={searchQuery}
            onChange={(value) => {
              setSearchQuery(value);
              setCurrentPage(1);
            }}
            onClear={() => setCurrentPage(1)}
            placeholder="Search contractors..."
          />
        ) : null}

        {contracts.length > 0 && filteredContracts.length === 0 ? (
          <div className={styles.emptySearch}>
            <div className={styles.emptySearchIcon}>
              <SearchIcon className={styles.searchIcon} strokeWidth={1.5} />
            </div>
            <h3 className={styles.emptySearchTitle}>No contractors found</h3>
            <p className={styles.emptySearchMessage}>
              No results matching &quot;{searchQuery}&quot;. Try adjusting your search.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.list}>
              {paginatedContracts.map((contract, index) => (
                <div key={contract.id} className={styles.card} style={{ animationDelay: `${index * 50}ms` }}>
                  <div className={styles.cardBody}>
                    <div className={styles.cardRow}>
                      <div className={styles.avatarWrap}>
                        <Avatar name={contract.name} email={contract.email} size="lg" />
                        {contract.lastStatus === `completed` ? (
                          <div className={styles.checkBadge}>
                            <CheckIcon className={styles.checkIcon} strokeWidth={3} />
                          </div>
                        ) : null}
                      </div>
                      <div className={styles.cardContent}>
                        <div className={styles.cardHeader}>
                          <div className={styles.cardHeaderLeft}>
                            <h3 className={styles.cardTitle}>{contract.name}</h3>
                            <p className={styles.cardEmail}>{contract.email}</p>
                          </div>
                          {contract.lastStatus ? (
                            <div className={styles.shrink0}>
                              <StatusBadge status={contract.lastStatus} />
                            </div>
                          ) : null}
                        </div>

                        <div className={styles.statGrid}>
                          <div className={styles.statBox}>
                            <div className={styles.statLabelRow}>
                              <CalendarIcon className={styles.statIcon} />
                              <p className={styles.statLabel}>Last Activity</p>
                            </div>
                            <p className={styles.statValue}>{formatDate(contract.lastActivity)}</p>
                          </div>
                          <div className={styles.statBox}>
                            <div className={styles.statLabelRow}>
                              <DocumentIcon className={styles.statIcon} />
                              <p className={styles.statLabel}>Documents</p>
                            </div>
                            <p className={styles.statValue}>{contract.docs}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {contract.lastRequestId ? (
                    <div className={styles.divider}>
                      <Link href={`/payments/${contract.lastRequestId}`} className={styles.viewPaymentLink}>
                        <span>View Latest Payment</span>
                        <ChevronRightIcon className={styles.linkIcon} strokeWidth={2.5} />
                      </Link>
                    </div>
                  ) : null}

                  {!contract.lastRequestId ? (
                    <div className={styles.noPayments}>
                      <p className={styles.noPaymentsText}>No payments yet</p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {totalPages > 1 ? (
              <div className={styles.pagination}>
                <p className={styles.paginationText}>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{` `}
                  {Math.min(currentPage * itemsPerPage, filteredContracts.length)} of {filteredContracts.length}
                </p>

                <div className={styles.paginationControls}>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={styles.paginationBtn}
                  >
                    Previous
                  </button>
                  <span className={styles.pageInfo}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={styles.paginationBtn}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
