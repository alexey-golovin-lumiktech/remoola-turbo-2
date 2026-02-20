'use client';

import { useDashboard } from '../../lib/hooks';
import { VerifyMeButton } from '../stripe';
import { DashboardSkeleton, ErrorState } from '../ui';
import { ActionRow } from './ActionRow';
import { ActivityTimeline } from './ActivityTimeline';
import { ComplianceTasksCard } from './ComplianceTasksCard';
import { DashboardHeader } from './DashboardHeader';
import { PendingRequestsTable } from './PendingRequestsTable';
import { PendingWithdrawalsCard } from './PendingWithdrawalsCard';
import { QuickDocsCard } from './QuickDocsCard';
import { SummaryCards } from './SummaryCards';
import styles from '../ui/classNames.module.css';

const { cardBaseSoftCompact, dashboardContainer, dashboardGrid, dashboardSidebar } = styles;
// Type is inferred from the hook

function getErrorMessage(error: unknown): string {
  if (typeof error === `string`) return error;
  if (error instanceof Error) return error.message;
  return `Failed to load dashboard`;
}

function isUnauthorizedError(error: unknown): boolean {
  const e = error as { status?: number };
  return e?.status === 401;
}

export function DashboardDataView() {
  const { data: dashboardData, error, isLoading } = useDashboard();

  if (error) {
    // 401: session expired – handleSessionExpired() already shows toast and redirects; avoid duplicate UI
    if (isUnauthorizedError(error)) {
      return (
        <div className={dashboardContainer} style={{ padding: `2rem`, textAlign: `center` }}>
          <p style={{ color: `var(--color-muted, #64748b)` }}>Redirecting to sign in…</p>
        </div>
      );
    }
    return (
      <ErrorState
        title="Failed to load dashboard"
        message={getErrorMessage(error)}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (isLoading || !dashboardData) return <DashboardSkeleton />;

  const summary = dashboardData?.summary as
    | { balanceCents?: number; activeRequests?: number; lastPaymentAt?: string | null }
    | undefined;
  const hasValidShape =
    dashboardData &&
    typeof dashboardData === `object` &&
    Array.isArray(dashboardData.pendingRequests) &&
    Array.isArray(dashboardData.activity) &&
    Array.isArray(dashboardData.tasks) &&
    Array.isArray(dashboardData.quickDocs) &&
    summary != null &&
    typeof summary.balanceCents === `number` &&
    typeof summary.activeRequests === `number`;

  if (!hasValidShape) {
    return (
      <ErrorState
        title="Failed to load dashboard"
        message="Invalid data received. Please try again."
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className={dashboardContainer} data-testid="consumer-dashboard">
      <DashboardHeader />

      <SummaryCards summary={dashboardData.summary} />

      <VerifyMeButton />

      <ActionRow />

      <div className={cardBaseSoftCompact} data-testid="consumer-dashboard-pending-requests">
        <PendingRequestsTable pendingRequests={dashboardData.pendingRequests} />
      </div>

      <div className={dashboardGrid}>
        <div className={cardBaseSoftCompact} data-testid="consumer-dashboard-activity">
          <ActivityTimeline activityTimelineItems={dashboardData.activity} />
        </div>

        <div className={dashboardSidebar}>
          <div className={cardBaseSoftCompact} data-testid="consumer-dashboard-pending-withdrawals">
            <PendingWithdrawalsCard />
          </div>
          <div className={cardBaseSoftCompact} data-testid="consumer-dashboard-compliance-tasks">
            <ComplianceTasksCard tasks={dashboardData.tasks} />
          </div>
          <div className={cardBaseSoftCompact} data-testid="consumer-dashboard-quick-docs">
            <QuickDocsCard docs={dashboardData.quickDocs} />
          </div>
        </div>
      </div>
    </div>
  );
}
