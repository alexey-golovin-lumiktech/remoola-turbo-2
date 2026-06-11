'use client';

import { type CreatePaymentRequestFormProps } from './CreatePaymentRequestForm';
import { CreatePaymentRequestPanel } from './CreatePaymentRequestPanel';
import { buildPaymentsPageMetrics, usePaymentsFiltersState } from './payments-filters-state';
import { PaymentsFiltersPanel } from './PaymentsFiltersPanel';
import { PaymentsListSection } from './PaymentsListSection';
import { PaymentsMetricsSection } from './PaymentsMetricsSection';
import { getContextualHelpGuides, HELP_CONTEXT_ROUTE } from '../../../features/help/get-contextual-help-guides';
import { HELP_GUIDE_SLUG } from '../../../features/help/guide-registry';
import { type PaymentsResponse } from '../../../lib/consumer-api.server';

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

      <PaymentsMetricsSection metrics={metrics} preferredCurrency={preferredCurrency} />

      <PaymentsFiltersPanel
        applyFilters={filterState.applyFilters}
        clearFilters={filterState.clearFilters}
        hasActiveFilters={filterState.hasActiveFilters}
        isFilterPending={filterState.isFilterPending}
        role={filterState.role}
        search={filterState.search}
        setRole={filterState.setRole}
        setSearch={filterState.setSearch}
        setStatus={filterState.setStatus}
        setType={filterState.setType}
        status={filterState.status}
        total={total}
        type={filterState.type}
      />

      <PaymentsListSection
        applyFilters={filterState.applyFilters}
        emptyStateHelpGuides={emptyStateHelpGuides}
        isFilterPending={filterState.isFilterPending}
        page={page}
        payments={payments}
        total={total}
        totalPages={metrics.totalPages}
      />
    </div>
  );
}
