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

export function DashboardDataView() {
  const { data: dashboardData, error, isLoading } = useDashboard();

  if (error) {
    return <ErrorState title="Failed to load dashboard" message={error} />;
  }

  if (isLoading || !dashboardData) return <DashboardSkeleton />;

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
