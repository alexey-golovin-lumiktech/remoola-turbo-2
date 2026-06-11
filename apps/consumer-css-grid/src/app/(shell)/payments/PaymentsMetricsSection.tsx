'use client';

import { type buildPaymentsPageMetrics } from './payments-filters-state';
import { formatMajorCurrency } from './payments-list-formatters';
import { MetricCard } from '../../../shared/ui/shell-data-display';

type Metrics = ReturnType<typeof buildPaymentsPageMetrics>;

export function PaymentsMetricsSection({
  metrics,
  preferredCurrency,
}: {
  metrics: Metrics;
  preferredCurrency: string;
}) {
  return (
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
  );
}
