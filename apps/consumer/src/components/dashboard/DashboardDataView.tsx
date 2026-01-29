'use client';

import { useDashboard } from '../../lib/hooks';
import { VerifyMeButton } from '../stripe';
import { DashboardSkeleton } from '../ui';
import { ActionRow } from './ActionRow';
import { ActivityTimeline } from './ActivityTimeline';
import { ComplianceTasksCard } from './ComplianceTasksCard';
import { DashboardHeader } from './DashboardHeader';
import { PendingRequestsTable } from './PendingRequestsTable';
import { PendingWithdrawalsCard } from './PendingWithdrawalsCard';
import { QuickDocsCard } from './QuickDocsCard';
import { SummaryCards } from './SummaryCards';
import styles from '../ui/classNames.module.css';

const {
  cardBaseSoftCompact,
  dashboardContainer,
  dashboardGrid,
  dashboardSidebar,
  emptyStateContainer,
  emptyStateIcon,
  emptyStateIconSvg,
  errorBoundaryText,
  errorBoundaryTitle,
  refreshButtonClass,
  textCenter,
} = styles;
// Type is inferred from the hook

export function DashboardDataView() {
  const { data: dashboardData, error, isLoading } = useDashboard();

  if (error) {
    return (
      <div className={emptyStateContainer}>
        <div className={textCenter}>
          <div className={emptyStateIcon}>
            <svg className={emptyStateIconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732
                0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className={errorBoundaryTitle}>Failed to load dashboard</h2>
          <p className={errorBoundaryText}>{error}</p>
          <button
            onClick={(e) => (e.preventDefault(), e.stopPropagation(), window.location.reload())}
            className={refreshButtonClass}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !dashboardData) return <DashboardSkeleton />;

  return (
    <div className={dashboardContainer}>
      <DashboardHeader />

      <SummaryCards summary={dashboardData.summary} />

      <VerifyMeButton />

      <ActionRow />

      <div className={cardBaseSoftCompact}>
        <PendingRequestsTable pendingRequests={dashboardData.pendingRequests} />
      </div>

      <div className={dashboardGrid}>
        <div className={cardBaseSoftCompact}>
          <ActivityTimeline activityTimelineItems={dashboardData.activity} />
        </div>

        <div className={dashboardSidebar}>
          <div className={cardBaseSoftCompact}>
            <PendingWithdrawalsCard />
          </div>
          <div className={cardBaseSoftCompact}>
            <ComplianceTasksCard tasks={dashboardData.tasks} />
          </div>
          <div className={cardBaseSoftCompact}>
            <QuickDocsCard docs={dashboardData.quickDocs} />
          </div>
        </div>
      </div>
    </div>
  );
}
