'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { useUrlFilters } from '../../../shared/hooks/useUrlFilters';
import { Avatar } from '../../../shared/ui/Avatar';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { FormInput } from '../../../shared/ui/FormInput';
import { FormSelect } from '../../../shared/ui/FormSelect';
import { StatCard } from '../../../shared/ui/StatCard';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { formatCurrency, formatRelativeDate } from '../../../shared/utils/date-format';

import type { Balance, PaymentItem } from '../schemas';

interface PaymentsListViewProps {
  balance: Balance | null;
  payments: PaymentItem[];
  total: number;
  currentPage?: number;
  pageSize?: number;
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat(undefined, {
    style: `decimal`,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
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
      className="
        space-y-6
        pb-20
      "
      data-testid="consumer-mobile-payments-list"
    >
      <div
        className="
          flex
          flex-col
          gap-4
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        <div>
          <h1
            className="
              text-2xl
              font-bold
              text-slate-900
              dark:text-white
            "
          >
            Payments
          </h1>
          {total > 0 && (
            <p
              className="
                mt-1
                text-sm
                text-slate-600
                dark:text-slate-400
              "
            >
              {total} {total === 1 ? `payment` : `payments`}
            </p>
          )}
        </div>
        <div
          className="
            flex
            flex-wrap
            gap-2
          "
        >
          <Link
            href="/withdraw-transfer"
            className="
              inline-flex
              min-h-[44px]
              items-center
              gap-2
              rounded-lg
              border
              border-slate-300
              bg-white
              px-4
              py-2
              text-sm
              font-semibold
              text-slate-700
              shadow-sm
              transition-all
              hover:bg-slate-50
              hover:border-slate-400
              focus:outline-none
              focus:ring-2
              focus:ring-slate-400
              focus:ring-offset-2
              dark:border-slate-600
              dark:bg-slate-800
              dark:text-slate-200
              dark:hover:bg-slate-700
            "
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            Withdraw / Transfer
          </Link>
          <Link
            href="/payment-requests/new"
            className="
              inline-flex
              min-h-[44px]
              items-center
              rounded-lg
              border
              border-primary-600
              bg-transparent
              px-4
              py-2
              text-sm
              font-semibold
              text-primary-600
              shadow-sm
              transition-all
              hover:bg-primary-50
              focus:outline-none
              focus:ring-2
              focus:ring-primary-500
              focus:ring-offset-2
              dark:border-primary-500
              dark:text-primary-400
              dark:hover:bg-primary-900/20
            "
          >
            Request payment
          </Link>
          <Link
            href="/payments/start"
            className="
              inline-flex
              min-h-[44px]
              items-center
              rounded-lg
              bg-primary-600
              px-4
              py-2
              text-sm
              font-semibold
              text-white
              shadow-sm
              transition-all
              hover:bg-primary-700
              hover:shadow-md
              focus:outline-none
              focus:ring-2
              focus:ring-primary-500
              focus:ring-offset-2
            "
          >
            Send payment
          </Link>
        </div>
      </div>

      {balanceEntries.length > 0 && (
        <section
          className="
            animate-fadeIn
          "
        >
          <h2
            className="
              mb-3
              text-lg
              font-semibold
              text-slate-900
              dark:text-white
            "
          >
            Balance
          </h2>
          <div
            className="
              grid
              gap-4
              sm:grid-cols-2
              lg:grid-cols-3
            "
          >
            {balanceEntries.map(([currency, amountCents]) => (
              <StatCard
                key={currency}
                label={currency}
                value={`${formatCents(amountCents)}`}
                icon={
                  <svg
                    className="
                      h-5
                      w-5
                    "
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
              />
            ))}
          </div>
        </section>
      )}

      {payments.length === 0 && total === 0 ? (
        <EmptyState
          icon={
            <svg
              className="
                h-8
                w-8
              "
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          }
          title="No payments yet"
          description="Start sending payments or requesting payments from others."
          action={{ label: `Send your first payment`, href: `/payments/start` }}
        />
      ) : (
        <section
          className="
            animate-fadeIn
            space-y-4
          "
        >
          <div
            className="
              flex
              flex-col
              gap-3
            "
          >
            <FormInput
              type="search"
              placeholder="Search by counterparty or description..."
              value={search}
              onChange={(e) => setFilters({ search: e.target.value })}
              className="w-full"
            />
            <div
              className="
                flex
                flex-wrap
                gap-3
              "
            >
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
                className="
                  min-w-[140px]
                  flex-1
                  sm:flex-none
                "
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
                className="
                  min-w-[140px]
                  flex-1
                  sm:flex-none
                "
              />
              {hasUrlFilters && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => clearFilters()}
                  className="
                    flex-1
                    sm:flex-none
                  "
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>

          {filteredPayments.length === 0 && hasUrlFilters ? (
            <Card>
              <p
                className="
                  text-center
                  text-slate-600
                  dark:text-slate-400
                "
              >
                No payments match your search criteria. Try adjusting your filters.
              </p>
            </Card>
          ) : (
            <>
              <div
                className="
                  space-y-3
                "
              >
                {displayedPayments.map((payment) => (
                  <Link
                    key={payment.id}
                    href={`/payments/${payment.id}`}
                    className="
                      block
                      transition-all
                      hover:scale-[1.01]
                    "
                  >
                    <Card noPadding>
                      <div
                        className="
                          p-4
                        "
                      >
                        <div
                          className="
                            flex
                            items-start
                            gap-3
                          "
                        >
                          <Avatar name={payment.counterparty.email} email={payment.counterparty.email} size="md" />
                          <div
                            className="
                              min-w-0
                              flex-1
                            "
                          >
                            <div
                              className="
                                flex
                                items-start
                                justify-between
                                gap-2
                              "
                            >
                              <div
                                className="
                                  min-w-0
                                  flex-1
                                "
                              >
                                <p
                                  className="
                                    truncate
                                    font-semibold
                                    text-slate-900
                                    dark:text-white
                                  "
                                >
                                  {payment.counterparty.email}
                                </p>
                                {payment.description && (
                                  <p
                                    className="
                                      mt-0.5
                                      truncate
                                      text-sm
                                      text-slate-600
                                      dark:text-slate-400
                                    "
                                  >
                                    {payment.description}
                                  </p>
                                )}
                              </div>
                              <StatusBadge status={payment.status} />
                            </div>

                            <div
                              className="
                                mt-3
                                flex
                                items-center
                                justify-between
                              "
                            >
                              <div>
                                <p
                                  className="
                                    text-lg
                                    font-bold
                                    text-slate-900
                                    dark:text-white
                                  "
                                >
                                  {formatCurrency(payment.amount / 100, payment.currencyCode)}
                                </p>
                                <p
                                  className="
                                    text-xs
                                    text-slate-500
                                    dark:text-slate-500
                                  "
                                  title={new Date(payment.createdAt).toLocaleString()}
                                >
                                  {formatRelativeDate(payment.createdAt)}
                                </p>
                              </div>
                              <div
                                className="
                                  flex
                                  items-center
                                  gap-1
                                  text-primary-600
                                  dark:text-primary-400
                                "
                              >
                                <span
                                  className="
                                    text-sm
                                    font-medium
                                  "
                                >
                                  View
                                </span>
                                <svg
                                  className="
                                    h-4
                                    w-4
                                  "
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>

              {!hasUrlFilters && totalPages > 1 && (
                <Card
                  className="
                    flex
                    flex-col
                    gap-4
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                  "
                >
                  <div
                    className="
                      text-sm
                      text-slate-600
                      dark:text-slate-400
                    "
                  >
                    Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, total)} of {total}
                  </div>
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      gap-2
                      sm:justify-start
                    "
                  >
                    <Link
                      href={currentPage > 1 ? `/payments?page=${currentPage - 1}` : `/payments?page=1`}
                      className={`
                        inline-flex
                        min-h-[44px]
                        items-center
                        rounded-lg
                        border
                        border-slate-300
                        bg-white
                        px-4
                        py-2
                        text-sm
                        font-medium
                        text-slate-700
                        shadow-sm
                        transition-all
                        hover:bg-slate-50
                        focus:outline-none
                        focus:ring-2
                        focus:ring-primary-500
                        focus:ring-offset-2
                        dark:border-slate-600
                        dark:bg-slate-800
                        dark:text-slate-200
                        dark:hover:bg-slate-700
                        ${currentPage === 1 ? `pointer-events-none opacity-50` : ``}
                      `}
                      aria-disabled={currentPage === 1}
                    >
                      Previous
                    </Link>
                    <span
                      className="
                        px-3
                        text-sm
                        font-medium
                        text-slate-900
                        dark:text-white
                      "
                    >
                      Page {currentPage} of {totalPages}
                    </span>
                    <Link
                      href={
                        currentPage < totalPages ? `/payments?page=${currentPage + 1}` : `/payments?page=${totalPages}`
                      }
                      className={`
                        inline-flex
                        min-h-[44px]
                        items-center
                        rounded-lg
                        border
                        border-slate-300
                        bg-white
                        px-4
                        py-2
                        text-sm
                        font-medium
                        text-slate-700
                        shadow-sm
                        transition-all
                        hover:bg-slate-50
                        focus:outline-none
                        focus:ring-2
                        focus:ring-primary-500
                        focus:ring-offset-2
                        dark:border-slate-600
                        dark:bg-slate-800
                        dark:text-slate-200
                        dark:hover:bg-slate-700
                        ${currentPage === totalPages ? `pointer-events-none opacity-50` : ``}
                      `}
                      aria-disabled={currentPage === totalPages}
                    >
                      Next
                    </Link>
                  </div>
                </Card>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
