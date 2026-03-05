import { ActivityTimeline } from './ActivityTimeline';
import { ComplianceTasksCard } from './ComplianceTasksCard';
import { PendingRequestsTable } from './PendingRequestsTable';
import { QuickDocsCard } from './QuickDocsCard';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { StatCard } from '../../../shared/ui/StatCard';
import { type DashboardData } from '../schemas';

interface DashboardViewProps {
  data: DashboardData | null;
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat(undefined, {
    style: `decimal`,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function DashboardView({ data }: DashboardViewProps) {
  if (!data) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        <p className="text-sm text-slate-600 dark:text-slate-400">Unable to load dashboard. Please try again later.</p>
      </div>
    );
  }

  const { summary, pendingRequests, activity, tasks, quickDocs } = data;

  return (
    <div className="space-y-6" data-testid="consumer-mobile-dashboard-view">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">
            {new Date().toLocaleDateString(undefined, { weekday: `short`, month: `short`, day: `numeric` })}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Balance"
          value={`$${formatCents(summary.balanceCents)}`}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          data-testid="dashboard-balance"
        />
        <StatCard
          label="Active requests"
          value={summary.activeRequests}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          }
          data-testid="dashboard-active-requests"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {pendingRequests.length > 0 ? (
          <PendingRequestsTable requests={pendingRequests} maxItems={5} />
        ) : (
          <EmptyState
            icon={
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            }
            title="No pending requests"
            description="You're all caught up! Create a new payment request to get started."
            action={{ label: `Create request`, href: `/payment-requests/new` }}
          />
        )}

        {tasks && tasks.length > 0 && <ComplianceTasksCard tasks={tasks} />}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {activity && activity.length > 0 && <ActivityTimeline activities={activity} maxItems={5} />}

        {quickDocs && quickDocs.length > 0 && <QuickDocsCard documents={quickDocs} maxItems={3} />}
      </div>
    </div>
  );
}
