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
// Type is inferred from the hook

export function DashboardDataView() {
  const { data: dashboardData, error, isLoading } = useDashboard();

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <div className="text-center">
          <div className="rounded-full bg-red-100 p-3 mb-4 mx-auto w-fit">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732
                0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load dashboard</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !dashboardData) return <DashboardSkeleton />;

  return (
    <div className="flex h-full flex-col gap-6 px-8 py-6">
      <DashboardHeader />

      <SummaryCards summary={dashboardData.summary} />

      <VerifyMeButton />

      <ActionRow />

      <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
        <PendingRequestsTable pendingRequests={dashboardData.pendingRequests} />
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
        <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
          <ActivityTimeline activityTimelineItems={dashboardData.activity} />
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
            <PendingWithdrawalsCard />
          </div>
          <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
            <ComplianceTasksCard tasks={dashboardData.tasks} />
          </div>
          <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
            <QuickDocsCard docs={dashboardData.quickDocs} />
          </div>
        </div>
      </div>
    </div>
  );
}
