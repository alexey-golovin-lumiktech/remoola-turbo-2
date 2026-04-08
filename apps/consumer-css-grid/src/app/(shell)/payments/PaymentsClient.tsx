'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { type CreatePaymentRequestFormProps } from './CreatePaymentRequestForm';
import { CreatePaymentRequestPanel } from './CreatePaymentRequestPanel';
import { buildPaymentsListQuery, formatPaymentTypeLabel, PAYMENT_TYPE_OPTIONS } from './payments-list-query';
import { type PaymentsResponse } from '../../../lib/consumer-api.server';
import { MetricCard, Panel } from '../../../shared/ui/shell-primitives';

type Props = {
  payments: PaymentsResponse[`items`];
  total: number;
  page: number;
  pageSize: number;
  initialSearch: string;
  initialStatus: string;
  initialType: string;
  initialRole: string;
  preferredCurrency: string;
  paymentRequestContacts: CreatePaymentRequestFormProps[`contacts`];
  paymentRequestCurrencies: CreatePaymentRequestFormProps[`currencies`];
};

const STATUS_OPTIONS = [``, `DRAFT`, `PENDING`, `WAITING`, `COMPLETED`, `DENIED`, `UNCOLLECTIBLE`];
const ROLE_OPTIONS = [``, `PAYER`, `REQUESTER`];

function formatMajorCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat(`en-US`, {
    style: `currency`,
    currency: currencyCode,
  }).format(amount);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(`en-US`, {
    year: `numeric`,
    month: `short`,
    day: `2-digit`,
  });
}

function formatStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split(`_`)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(` `);
}

function formatRoleLabel(role: string) {
  return role === `PAYER` ? `Payer` : role === `REQUESTER` ? `Requester` : role;
}

export function PaymentsClient({
  payments,
  total,
  page,
  pageSize,
  initialSearch,
  initialStatus,
  initialType,
  initialRole,
  preferredCurrency,
  paymentRequestContacts,
  paymentRequestCurrencies,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isFilterPending, startFilterTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [type, setType] = useState(initialType);
  const [role, setRole] = useState(initialRole);
  const hasActiveFilters = search !== `` || status !== `` || type !== `` || role !== ``;

  const distinctCurrencies = Array.from(new Set(payments.map((payment) => payment.currencyCode)));
  const hasSingleCurrency = distinctCurrencies.length === 1;
  const incomingAmount = payments
    .filter((payment) => payment.role === `REQUESTER`)
    .reduce((sum, payment) => sum + payment.amount, 0);
  const outgoingAmount = payments
    .filter((payment) => payment.role === `PAYER`)
    .reduce((sum, payment) => sum + payment.amount, 0);
  const incomingCount = payments.filter((payment) => payment.role === `REQUESTER`).length;
  const outgoingCount = payments.filter((payment) => payment.role === `PAYER`).length;
  const processingCount = payments.filter((payment) => payment.status.toLowerCase() !== `completed`).length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const applyFilters = (nextPage = 1) => {
    const params = buildPaymentsListQuery({
      search,
      status,
      type,
      role,
      page: nextPage,
      pageSize,
    });
    startFilterTransition(() => {
      router.push(`${pathname}?${params}`);
    });
  };

  const clearFilters = () => {
    setSearch(``);
    setStatus(``);
    setType(``);
    setRole(``);

    const params = buildPaymentsListQuery({
      search: ``,
      status: ``,
      type: ``,
      role: ``,
      page: 1,
      pageSize,
    });

    startFilterTransition(() => {
      router.push(`${pathname}?${params}`);
    });
  };

  return (
    <div className="space-y-5">
      <CreatePaymentRequestPanel
        contacts={paymentRequestContacts}
        currencies={paymentRequestCurrencies}
        preferredCurrency={preferredCurrency}
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard
          icon="↑"
          label="Incoming"
          value={
            hasSingleCurrency && incomingCount > 0
              ? formatMajorCurrency(incomingAmount, distinctCurrencies[0] ?? preferredCurrency)
              : `${incomingCount}`
          }
          sublabel={hasSingleCurrency && incomingCount > 0 ? `Visible on this page` : `Incoming payments on this page`}
          accent="text-emerald-300"
        />
        <MetricCard
          icon="↓"
          label="Outgoing"
          value={
            hasSingleCurrency && outgoingCount > 0
              ? formatMajorCurrency(outgoingAmount, distinctCurrencies[0] ?? preferredCurrency)
              : `${outgoingCount}`
          }
          sublabel={hasSingleCurrency && outgoingCount > 0 ? `Visible on this page` : `Outgoing payments on this page`}
        />
        <MetricCard
          icon="◎"
          label="Processing"
          value={String(processingCount)}
          sublabel="Non-completed payments on this page"
        />
      </section>

      <Panel
        title="Payments filters"
        aside={hasActiveFilters ? `${total} total · filters active` : `${total} total`}
        data-testid="payments-filters"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by description or counterparty"
            aria-label="Search payments by description or counterparty"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25"
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by payment status"
            className="w-full rounded-2xl border border-white/10 bg-[#0a1833] px-4 py-3 text-white outline-none"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option || `all-statuses`} value={option}>
                {option || `All statuses`}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            aria-label="Filter by payment type"
            className="w-full rounded-2xl border border-white/10 bg-[#0a1833] px-4 py-3 text-white outline-none"
          >
            {PAYMENT_TYPE_OPTIONS.map((option) => (
              <option key={option || `all-types`} value={option}>
                {option ? formatPaymentTypeLabel(option) : `All types`}
              </option>
            ))}
          </select>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            aria-label="Filter by role"
            className="w-full rounded-2xl border border-white/10 bg-[#0a1833] px-4 py-3 text-white outline-none"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option || `all-roles`} value={option}>
                {option ? formatRoleLabel(option) : `All roles`}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isFilterPending}
              onClick={() => applyFilters(1)}
              className="rounded-2xl bg-blue-500 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isFilterPending ? `Applying...` : `Apply`}
            </button>
            {hasActiveFilters ? (
              <button
                type="button"
                disabled={isFilterPending}
                onClick={clearFilters}
                className="rounded-2xl border border-white/10 px-4 py-3 font-medium text-white/70 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
      </Panel>

      <Panel
        title="Recent payments"
        aside={`Page ${page} of ${totalPages} · ${payments.length} shown · ${total} total`}
        data-testid="payments-list"
      >
        {payments.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-white/45">
            No payments match the current filters.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {payments.map((payment) => (
              <Link
                key={payment.id}
                href={`/payments/${payment.id}`}
                className="block rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20 hover:bg-white/8"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-white/90">
                      {payment.description ||
                        payment.counterparty.email ||
                        formatPaymentTypeLabel(payment.type || ``) ||
                        `Payment`}
                    </div>
                    <div className="mt-1 text-sm text-white/45">{formatDate(payment.createdAt)}</div>
                    <div className="mt-2 text-xs text-white/35">
                      {formatStatusLabel(payment.status)} · {formatRoleLabel(payment.role)} ·{` `}
                      {payment.counterparty.email || `No counterparty`}
                    </div>
                    {payment.latestTransaction ? (
                      <div className="mt-2 text-xs text-blue-200/85">
                        Latest ledger update: {formatStatusLabel(payment.latestTransaction.status)} on{` `}
                        {formatDate(payment.latestTransaction.createdAt)}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-white/90">
                      {formatMajorCurrency(payment.amount, payment.currencyCode)}
                    </div>
                    <div className="mt-1 text-sm text-white/45">{formatStatusLabel(payment.status)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isFilterPending || page <= 1}
            onClick={() => applyFilters(page - 1)}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/75 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={isFilterPending || page >= totalPages}
            onClick={() => applyFilters(page + 1)}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/75 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </Panel>
    </div>
  );
}
