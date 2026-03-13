'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { useUrlFilters } from '../../../shared/hooks/useUrlFilters';
import { Avatar } from '../../../shared/ui/Avatar';
import { BalanceCard } from '../../../shared/ui/BalanceCard';
import { Button } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { FormSelect } from '../../../shared/ui/FormSelect';
import { IconBadge } from '../../../shared/ui/IconBadge';
import { ChevronRightIcon } from '../../../shared/ui/icons/ChevronRightIcon';
import { ClockIcon } from '../../../shared/ui/icons/ClockIcon';
import { CreditCardIcon } from '../../../shared/ui/icons/CreditCardIcon';
import { SearchIcon } from '../../../shared/ui/icons/SearchIcon';
import { SwitchHorizontalIcon } from '../../../shared/ui/icons/SwitchHorizontalIcon';
import { UsersIcon } from '../../../shared/ui/icons/UsersIcon';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { PaginationButton } from '../../../shared/ui/PaginationButton';
import { SearchInput } from '../../../shared/ui/SearchInput';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { formatCurrency, formatRelativeDate } from '../../../shared/utils/date-format';
import { type Balance, type PaymentItem } from '../schemas';
import styles from './PaymentsListView.module.css';

interface PaymentsListViewProps {
  balance: Balance | null;
  payments: PaymentItem[];
  total: number;
  currentPage?: number;
  pageSize?: number;
}

interface PaymentFilters {
  search?: string;
  status?: string;
  type?: string;
  [key: string]: string | undefined;
}

export function PaymentsListView({ balance, payments, total, currentPage = 1, pageSize = 20 }: PaymentsListViewProps) {
  const balanceEntries = balance ? Object.entries(balance) : [];
  const { filters, setFilters, clearFilters, hasActiveFilters: hasUrlFilters } = useUrlFilters<PaymentFilters>();

  const search = filters.search ?? ``;
  const statusFilter = filters.status ?? ``;
  const typeFilter = filters.type ?? ``;

  const filteredPayments = useMemo(() => {
    let result = [...payments];

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.description?.toLowerCase().includes(searchLower) ||
          item.counterparty?.email?.toLowerCase().includes(searchLower) ||
          item.id?.toLowerCase().includes(searchLower),
      );
    }

    if (statusFilter) {
      result = result.filter((item) => item.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    if (typeFilter) {
      result = result.filter((item) => item.type === typeFilter);
    }

    return result;
  }, [payments, search, statusFilter, typeFilter]);

  const totalPages = Math.ceil(total / pageSize);
  const displayedPayments = hasUrlFilters ? filteredPayments : payments;

  return (
    <div className={styles.pageBg}>
      <PageHeader
        icon={<IconBadge icon={<CreditCardIcon className={styles.headerIcon} />} hasRing />}
        title="Payments"
        subtitle={total > 0 ? `${total} ${total === 1 ? `payment` : `payments`}` : undefined}
        actions={
          <>
            <Link href="/withdraw-transfer" className={styles.withdrawLink}>
              <SwitchHorizontalIcon className={styles.withdrawLinkIcon} strokeWidth={2} />
              Withdraw / Transfer
            </Link>
            <Link href="/payment-requests/new" className={styles.requestLink}>
              Request payment
            </Link>
            <Link href="/payments/start" className={styles.sendLink}>
              Send payment
            </Link>
          </>
        }
      />

      <div className={styles.main} data-testid="consumer-mobile-payments-list">
        {balanceEntries.length > 0 ? (
          <section className={styles.balanceSection}>
            <div className={styles.balanceHeader}>
              <UsersIcon className={styles.balanceIcon} />
              <h2 className={styles.balanceTitle}>Balance</h2>
            </div>
            <div className={styles.balanceGrid}>
              {balanceEntries.map(([currency, amountCents], index) => (
                <BalanceCard
                  key={currency}
                  amountCents={amountCents}
                  currencyCode={currency}
                  animationDelay={index * 50}
                />
              ))}
            </div>
          </section>
        ) : null}

        {payments.length === 0 && total === 0 ? (
          <EmptyState
            icon={<CreditCardIcon className={styles.emptySearchIconSvg} />}
            title="No payments yet"
            description="Start sending payments or requesting payments from others."
            action={{ label: `Send your first payment`, href: `/payments/start` }}
          />
        ) : (
          <section className={styles.listSection}>
            <div className={styles.filtersWrap}>
              <SearchInput
                value={search}
                onChange={(value) => setFilters({ search: value })}
                placeholder="Search by counterparty or description..."
              />
              <div className={styles.filtersRow}>
                <FormSelect
                  value={statusFilter}
                  onChange={(e) => setFilters({ status: e.target.value })}
                  options={[
                    { value: ``, label: `All statuses` },
                    { value: `PENDING`, label: `Pending` },
                    { value: `COMPLETED`, label: `Completed` },
                    { value: `WAITING`, label: `Waiting` },
                    { value: `FAILED`, label: `Failed` },
                  ]}
                  className={styles.filterSelect}
                />
                <FormSelect
                  value={typeFilter}
                  onChange={(e) => setFilters({ type: e.target.value })}
                  options={[
                    { value: ``, label: `All types` },
                    { value: `CREDIT_CARD`, label: `Credit Card` },
                    { value: `BANK_TRANSFER`, label: `Bank Transfer` },
                    { value: `CURRENCY_EXCHANGE`, label: `Currency Exchange` },
                  ]}
                  className={styles.filterSelect}
                />
                {hasUrlFilters ? (
                  <Button variant="outline" size="md" onClick={() => clearFilters()} className={styles.clearFiltersBtn}>
                    Clear filters
                  </Button>
                ) : null}
              </div>
            </div>

            {filteredPayments.length === 0 && hasUrlFilters ? (
              <div className={styles.emptySearch}>
                <div className={styles.emptySearchIcon}>
                  <SearchIcon className={styles.emptySearchIconSvg} />
                </div>
                <p className={styles.emptySearchTitle}>No payments found</p>
                <p className={styles.emptySearchMessage}>
                  No payments match your search criteria. Try adjusting your filters.
                </p>
              </div>
            ) : (
              <>
                <div className={styles.list}>
                  {displayedPayments.map((payment, index) => (
                    <Link
                      key={payment.id}
                      href={`/payments/${payment.id}`}
                      className={styles.cardLink}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className={styles.card}>
                        <div className={styles.cardBody}>
                          <div className={styles.cardRow}>
                            <Avatar name={payment.counterparty.email} email={payment.counterparty.email} size="lg" />
                            <div className={styles.cardContent}>
                              <div className={styles.cardHeader}>
                                <div className={styles.cardHeaderLeft}>
                                  <p className={styles.cardTitle}>{payment.counterparty.email}</p>
                                  {payment.description ? (
                                    <p className={styles.cardDescription}>{payment.description}</p>
                                  ) : null}
                                </div>
                                <StatusBadge status={payment.status} />
                              </div>

                              <div className={styles.cardFooter}>
                                <div>
                                  <p className={styles.cardAmount}>
                                    {formatCurrency(payment.amount / 100, payment.currencyCode)}
                                  </p>
                                  <div className={styles.cardDateRow}>
                                    <ClockIcon className={styles.cardDateIcon} />
                                    <p
                                      className={styles.cardDateText}
                                      title={new Date(payment.createdAt).toLocaleString()}
                                    >
                                      {formatRelativeDate(payment.createdAt)}
                                    </p>
                                  </div>
                                </div>
                                <div className={styles.viewLink}>
                                  <span className={styles.viewLinkText}>View</span>
                                  <ChevronRightIcon className={styles.viewIcon} strokeWidth={2.5} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {!hasUrlFilters && totalPages > 1 ? (
                  <div className={styles.pagination}>
                    <div className={styles.paginationText}>
                      Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, total)} of {total}
                    </div>
                    <div className={styles.paginationControls}>
                      <PaginationButton
                        href={currentPage > 1 ? `/payments?page=${currentPage - 1}` : `/payments?page=1`}
                        disabled={currentPage === 1}
                        aria-disabled={currentPage === 1}
                      >
                        Previous
                      </PaginationButton>
                      <span className={styles.paginationPage}>
                        {currentPage} / {totalPages}
                      </span>
                      <PaginationButton
                        href={
                          currentPage < totalPages
                            ? `/payments?page=${currentPage + 1}`
                            : `/payments?page=${totalPages}`
                        }
                        disabled={currentPage === totalPages}
                        aria-disabled={currentPage === totalPages}
                      >
                        Next
                      </PaginationButton>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
