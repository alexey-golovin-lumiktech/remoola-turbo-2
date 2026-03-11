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
import { SearchInput } from '../../../shared/ui/SearchInput';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { formatCurrency, formatRelativeDate } from '../../../shared/utils/date-format';
import { type Balance, type PaymentItem } from '../schemas';

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
    <div
      className={`
      min-h-full
      bg-linear-to-br
      from-slate-50
      via-white
      to-slate-50
      dark:from-slate-950
      dark:via-slate-900
      dark:to-slate-950
    `}
    >
      <PageHeader
        icon={<IconBadge icon={<CreditCardIcon className={`h-6 w-6 text-white`} />} hasRing />}
        title="Payments"
        subtitle={total > 0 ? `${total} ${total === 1 ? `payment` : `payments`}` : undefined}
        actions={
          <>
            <Link
              href="/withdraw-transfer"
              className={`
                inline-flex
                min-h-11
                items-center
                gap-2
                rounded-xl
                border
                border-slate-200
                bg-slate-100
                px-4
                py-2.5
                text-sm
                font-bold
                text-slate-800
                shadow-md
                transition-all
                hover:bg-slate-200
                dark:border-slate-700
                dark:bg-slate-800
                dark:text-slate-200
                dark:hover:bg-slate-700
                hover:shadow-lg
                active:scale-95
                focus:outline-hidden
                focus:ring-2
                focus:ring-slate-500
                focus:ring-offset-2
              `}
            >
              <SwitchHorizontalIcon className={`h-4 w-4`} strokeWidth={2} />
              Withdraw / Transfer
            </Link>
            <Link
              href="/payment-requests/new"
              className={`
                inline-flex
                min-h-11
                items-center
                rounded-xl
                border-2
                border-primary-600
                bg-transparent
                px-4
                py-2.5
                text-sm
                font-bold
                text-primary-600
                shadow-md
                transition-all
                hover:bg-primary-600
                hover:text-white
                hover:shadow-lg
                active:scale-95
                focus:outline-hidden
                focus:ring-2
                focus:ring-primary-500
                focus:ring-offset-2
                dark:border-primary-500
                dark:text-primary-400
                dark:hover:bg-primary-500
                dark:hover:text-white
              `}
            >
              Request payment
            </Link>
            <Link
              href="/payments/start"
              className={`
                inline-flex
                min-h-11
                items-center
                rounded-xl
                bg-linear-to-r
                from-primary-600
                to-primary-700
                px-4
                py-2.5
                text-sm
                font-bold
                text-white
                shadow-lg
                shadow-primary-500/30
                transition-all
                hover:from-primary-700
                hover:to-primary-800
                hover:shadow-xl
                active:scale-95
                focus:outline-hidden
                focus:ring-2
                focus:ring-primary-500
                focus:ring-offset-2
              `}
            >
              Send payment
            </Link>
          </>
        }
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
          space-y-6
          animate-fadeIn
        `}
        data-testid="consumer-mobile-payments-list"
      >
        {balanceEntries.length > 0 && (
          <section className={`animate-fadeIn`}>
            <div
              className={`
              mb-4
              flex
              items-center
              gap-2
            `}
            >
              <UsersIcon
                className={`
                  h-5
                  w-5
                  text-primary-600
                  dark:text-primary-400
                `}
              />
              <h2
                className={`
                text-xl
                font-bold
                text-slate-900
                dark:text-white
              `}
              >
                Balance
              </h2>
            </div>
            <div
              className={`
              grid
              gap-4
              sm:grid-cols-2
              lg:grid-cols-3
            `}
            >
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
        )}

        {payments.length === 0 && total === 0 ? (
          <EmptyState
            icon={<CreditCardIcon className={`h-8 w-8`} />}
            title="No payments yet"
            description="Start sending payments or requesting payments from others."
            action={{ label: `Send your first payment`, href: `/payments/start` }}
          />
        ) : (
          <section className={`animate-fadeIn space-y-5`}>
            <div className={`space-y-3`}>
              <SearchInput
                value={search}
                onChange={(value) => setFilters({ search: value })}
                placeholder="Search by counterparty or description..."
              />
              <div className={`flex flex-wrap gap-3`}>
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
                  className={`min-w-35 flex-1 sm:flex-none`}
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
                  className={`min-w-35 flex-1 sm:flex-none`}
                />
                {hasUrlFilters && (
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => clearFilters()}
                    className={`
                      flex-1
                      sm:flex-none
                      min-h-11
                      font-semibold
                    `}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </div>

            {filteredPayments.length === 0 && hasUrlFilters ? (
              <div
                className={`
                animate-fadeIn
                rounded-2xl
                border-2
                border-dashed
                border-slate-200
                bg-linear-to-br
                from-slate-50
                to-slate-100
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
                  mb-4
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-2xl
                  bg-slate-200
                  shadow-lg
                  dark:bg-slate-700
                `}
                >
                  <SearchIcon className={`h-8 w-8 text-slate-500 dark:text-slate-400`} />
                </div>
                <p className={`text-base font-bold text-slate-800 dark:text-slate-200`}>No payments found</p>
                <p className={`mt-2 text-sm text-slate-500 dark:text-slate-400`}>
                  No payments match your search criteria. Try adjusting your filters.
                </p>
              </div>
            ) : (
              <>
                <div className={`space-y-3`}>
                  {displayedPayments.map((payment, index) => (
                    <Link
                      key={payment.id}
                      href={`/payments/${payment.id}`}
                      className={`
                        block
                        transition-all
                        duration-300
                        hover:scale-[1.02]
                        animate-fadeIn
                      `}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div
                        className={`
                        group
                        overflow-hidden
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        shadow-lg
                        transition-all
                        duration-300
                        hover:bg-slate-50
                        hover:shadow-xl
                        dark:border-slate-700
                        dark:bg-slate-800/90
                        dark:hover:bg-slate-800
                      `}
                      >
                        <div className={`p-4`}>
                          <div className={`flex items-start gap-4`}>
                            <Avatar name={payment.counterparty.email} email={payment.counterparty.email} size="lg" />
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
                                  <p
                                    className={`
                                    truncate
                                    text-base
                                    font-bold
                                    text-slate-900
                                    transition-colors
                                    group-hover:text-slate-800
                                    dark:text-slate-100
                                    dark:group-hover:text-white
                                  `}
                                  >
                                    {payment.counterparty.email}
                                  </p>
                                  {payment.description && (
                                    <p
                                      className={`
                                      mt-0.5
                                      truncate
                                      text-sm
                                      font-medium
                                      text-slate-500
                                      dark:text-slate-400
                                    `}
                                    >
                                      {payment.description}
                                    </p>
                                  )}
                                </div>
                                <StatusBadge status={payment.status} />
                              </div>

                              <div
                                className={`
                                mt-3
                                flex
                                items-center
                                justify-between
                              `}
                              >
                                <div>
                                  <p className={`text-xl font-extrabold text-slate-900 dark:text-slate-100`}>
                                    {formatCurrency(payment.amount / 100, payment.currencyCode)}
                                  </p>
                                  <div
                                    className={`
                                    mt-1
                                    flex
                                    items-center
                                    gap-1.5
                                  `}
                                  >
                                    <ClockIcon className={`h-3.5 w-3.5 text-slate-500`} />
                                    <p
                                      className={`text-xs font-medium text-slate-500`}
                                      title={new Date(payment.createdAt).toLocaleString()}
                                    >
                                      {formatRelativeDate(payment.createdAt)}
                                    </p>
                                  </div>
                                </div>
                                <div
                                  className={`
                                  flex
                                  items-center
                                  gap-2
                                  text-primary-600
                                  dark:text-primary-400
                                `}
                                >
                                  <span className={`text-sm font-bold`}>View</span>
                                  <ChevronRightIcon
                                    className={`
                                      h-5
                                      w-5
                                      transition-transform
                                      group-hover:translate-x-1
                                    `}
                                    strokeWidth={2.5}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {!hasUrlFilters && totalPages > 1 && (
                  <div
                    className={`
                    flex
                    items-center
                    justify-between
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50
                    px-5
                    py-3
                    shadow-md
                    dark:border-slate-700
                    dark:bg-slate-800/50
                  `}
                  >
                    <div className={`text-sm font-medium text-slate-600 dark:text-slate-400`}>
                      Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, total)} of {total}
                    </div>
                    <div className={`flex items-center gap-2`}>
                      <Link
                        href={currentPage > 1 ? `/payments?page=${currentPage - 1}` : `/payments?page=1`}
                        className={`inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-100 active:scale-95 focus:outline-hidden focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 ${currentPage === 1 ? `pointer-events-none opacity-40` : ``}`}
                        aria-disabled={currentPage === 1}
                      >
                        Previous
                      </Link>
                      <span className={`text-sm font-medium text-slate-600 dark:text-slate-400`}>
                        {currentPage} / {totalPages}
                      </span>
                      <Link
                        href={
                          currentPage < totalPages
                            ? `/payments?page=${currentPage + 1}`
                            : `/payments?page=${totalPages}`
                        }
                        className={`inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-100 active:scale-95 focus:outline-hidden focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 ${currentPage === totalPages ? `pointer-events-none opacity-40` : ``}`}
                        aria-disabled={currentPage === totalPages}
                      >
                        Next
                      </Link>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
