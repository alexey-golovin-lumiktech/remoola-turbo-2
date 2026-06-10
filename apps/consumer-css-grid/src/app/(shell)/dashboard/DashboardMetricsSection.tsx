import { formatCurrencyFromMinor } from './dashboard-view-model';
import { type DashboardData } from '../../../lib/consumer-api.server';
import { MetricCard } from '../../../shared/ui/shell-data-display';
import { shellGridMetrics4 } from '../../../shared/ui/shell-grid-tokens';

type DashboardSummary = DashboardData[`summary`];

export function DashboardMetricsSection({
  availableCurrencyCode,
  dashboardUnavailable,
  settledCurrencyCode,
  summary,
}: {
  availableCurrencyCode: string;
  dashboardUnavailable: boolean;
  settledCurrencyCode: string;
  summary: DashboardSummary | undefined;
}) {
  return (
    <>
      <section className={shellGridMetrics4}>
        <MetricCard
          icon="◉"
          label="Settled balance"
          value={dashboardUnavailable ? `—` : formatCurrencyFromMinor(summary?.balanceCents ?? 0, settledCurrencyCode)}
          sublabel={dashboardUnavailable ? `Live dashboard data unavailable` : `Completed wallet balance`}
          accent={
            dashboardUnavailable
              ? `text-(--app-text)`
              : (summary?.balanceCents ?? 0) < 0
                ? `text-(--app-warning-text)`
                : `text-(--app-success-text)`
          }
        />
        <MetricCard
          icon="◎"
          label="Available balance"
          value={
            dashboardUnavailable
              ? `—`
              : formatCurrencyFromMinor(summary?.availableBalanceCents ?? 0, availableCurrencyCode)
          }
          sublabel={dashboardUnavailable ? `Live dashboard data unavailable` : `Used by exchange and withdrawal flows`}
          accent={
            dashboardUnavailable
              ? `text-(--app-text)`
              : (summary?.availableBalanceCents ?? 0) < 0
                ? `text-(--app-warning-text)`
                : `text-(--app-primary)`
          }
        />
        <MetricCard
          icon="▣"
          label="Requests"
          value={dashboardUnavailable ? `—` : String(summary?.activeRequests ?? 0)}
          sublabel={dashboardUnavailable ? `Live dashboard data unavailable` : `Active payment requests`}
        />
        <MetricCard
          icon="◔"
          label="Last payment"
          value={
            dashboardUnavailable
              ? `—`
              : summary?.lastPaymentAt
                ? new Date(summary.lastPaymentAt).toLocaleDateString(`en-US`)
                : `—`
          }
          sublabel={
            dashboardUnavailable
              ? `Live dashboard data unavailable`
              : summary?.lastPaymentAt
                ? new Date(summary.lastPaymentAt).toLocaleTimeString(`en-US`)
                : `No payments yet`
          }
        />
      </section>

      {!dashboardUnavailable ? (
        <section className="mt-4 rounded-[24px] border border-(--app-border) bg-(--app-surface) px-4 py-3 text-sm text-(--app-text-muted)">
          Settled balance reflects completed wallet entries. Available balance reflects the spendable-now view already
          used by exchange and withdrawal flows.
        </section>
      ) : null}
    </>
  );
}
