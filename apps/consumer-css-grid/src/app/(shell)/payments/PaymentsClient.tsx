'use client';

import Link from 'next/link';

import { type CreatePaymentRequestFormProps } from './CreatePaymentRequestForm';
import { CreatePaymentRequestPanel } from './CreatePaymentRequestPanel';
import { buildPaymentsPageMetrics, usePaymentsFiltersState } from './payments-filters-state';
import { formatPaymentTypeLabel, PAYMENT_TYPE_OPTIONS } from './payments-list-query';
import { getContextualHelpGuides, HELP_CONTEXT_ROUTE } from '../../../features/help/get-contextual-help-guides';
import { HELP_GUIDE_SLUG } from '../../../features/help/guide-registry';
import { HelpContextualGuides } from '../../../features/help/ui';
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
  const filterState = usePaymentsFiltersState({
    pageSize,
    initialSearch,
    initialStatus,
    initialType,
    initialRole,
  });
  const metrics = buildPaymentsPageMetrics(payments, total, pageSize);
  const emptyStateHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.PAYMENTS,
    preferredSlugs: [
      HELP_GUIDE_SLUG.PAYMENTS_OVERVIEW,
      HELP_GUIDE_SLUG.PAYMENTS_CREATE_REQUEST,
      HELP_GUIDE_SLUG.PAYMENTS_START_PAYMENT,
    ],
  });

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
            metrics.hasSingleCurrency && metrics.incomingCount > 0
              ? formatMajorCurrency(metrics.incomingAmount, metrics.distinctCurrencies[0] ?? preferredCurrency)
              : `${metrics.incomingCount}`
          }
          sublabel={
            metrics.hasSingleCurrency && metrics.incomingCount > 0
              ? `Visible on this page`
              : `Incoming payments on this page`
          }
          accent="text-(--app-success-text)"
        />
        <MetricCard
          icon="↓"
          label="Outgoing"
          value={
            metrics.hasSingleCurrency && metrics.outgoingCount > 0
              ? formatMajorCurrency(metrics.outgoingAmount, metrics.distinctCurrencies[0] ?? preferredCurrency)
              : `${metrics.outgoingCount}`
          }
          sublabel={
            metrics.hasSingleCurrency && metrics.outgoingCount > 0
              ? `Visible on this page`
              : `Outgoing payments on this page`
          }
        />
        <MetricCard
          icon="◎"
          label="Processing"
          value={String(metrics.processingCount)}
          sublabel="Non-completed payments on this page"
        />
      </section>

      <Panel
        title="Payments filters"
        aside={filterState.hasActiveFilters ? `${total} total · filters active` : `${total} total`}
        data-testid="payments-filters"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_auto]">
          <input
            value={filterState.search}
            onChange={(event) => filterState.setSearch(event.target.value)}
            placeholder="Search by description or counterparty"
            aria-label="Search payments by description or counterparty"
            className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
          />
          <select
            value={filterState.status}
            onChange={(event) => filterState.setStatus(event.target.value)}
            aria-label="Filter by payment status"
            className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-strong) px-4 py-3 text-(--app-text) outline-none"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option || `all-statuses`} value={option}>
                {option || `All statuses`}
              </option>
            ))}
          </select>
          <select
            value={filterState.type}
            onChange={(event) => filterState.setType(event.target.value)}
            aria-label="Filter by payment type"
            className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-strong) px-4 py-3 text-(--app-text) outline-none"
          >
            {PAYMENT_TYPE_OPTIONS.map((option) => (
              <option key={option || `all-types`} value={option}>
                {option ? formatPaymentTypeLabel(option) : `All types`}
              </option>
            ))}
          </select>
          <select
            value={filterState.role}
            onChange={(event) => filterState.setRole(event.target.value)}
            aria-label="Filter by role"
            className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-strong) px-4 py-3 text-(--app-text) outline-none"
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
              disabled={filterState.isFilterPending}
              onClick={() => filterState.applyFilters(1)}
              className="rounded-2xl bg-(--app-primary) px-4 py-3 font-medium text-(--app-text) disabled:cursor-not-allowed disabled:opacity-50"
            >
              {filterState.isFilterPending ? `Applying...` : `Apply`}
            </button>
            {filterState.hasActiveFilters ? (
              <button
                type="button"
                disabled={filterState.isFilterPending}
                onClick={filterState.clearFilters}
                className="rounded-2xl border border-(--app-border) px-4 py-3 font-medium text-(--app-text-soft) transition hover:border-(--app-border-strong) hover:text-(--app-text) disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
      </Panel>

      <Panel
        title="Recent payments"
        aside={`Page ${page} of ${metrics.totalPages} · ${payments.length} shown · ${total} total`}
        data-testid="payments-list"
      >
        {payments.length === 0 ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-10 text-center text-sm text-(--app-text-muted)">
              No payments match the current filters.
            </div>
            <HelpContextualGuides
              guides={emptyStateHelpGuides}
              compact
              title="Need help finding the next payment step?"
              description="Use these guides to reset the flow, choose the right payment path, or understand what should appear in the list."
            />
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {payments.map((payment) => (
              <Link
                key={payment.id}
                href={`/payments/${payment.id}`}
                className="block rounded-2xl border border-(--app-border) bg-(--app-surface-muted) p-4 transition hover:border-(--app-border-strong) hover:bg-(--app-surface-muted)"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-(--app-text)">
                      {payment.description ||
                        payment.counterparty.email ||
                        formatPaymentTypeLabel(payment.type || ``) ||
                        `Payment`}
                    </div>
                    <div className="mt-1 text-sm text-(--app-text-muted)">{formatDate(payment.createdAt)}</div>
                    <div className="mt-2 text-xs text-(--app-text-faint)">
                      {formatStatusLabel(payment.status)} · {formatRoleLabel(payment.role)} ·{` `}
                      {payment.counterparty.email || `No counterparty`}
                    </div>
                    {payment.latestTransaction ? (
                      <div className="mt-2 text-xs text-(--app-primary)">
                        Latest ledger update: {formatStatusLabel(payment.latestTransaction.status)} on{` `}
                        {formatDate(payment.latestTransaction.createdAt)}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-(--app-text)">
                      {formatMajorCurrency(payment.amount, payment.currencyCode)}
                    </div>
                    <div className="mt-1 text-sm text-(--app-text-muted)">{formatStatusLabel(payment.status)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={filterState.isFilterPending || page <= 1}
            onClick={() => filterState.applyFilters(page - 1)}
            className="rounded-xl border border-(--app-border) px-3 py-2 text-sm text-(--app-text-soft) disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={filterState.isFilterPending || page >= metrics.totalPages}
            onClick={() => filterState.applyFilters(page + 1)}
            className="rounded-xl border border-(--app-border) px-3 py-2 text-sm text-(--app-text-soft) disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </Panel>
    </div>
  );
}
