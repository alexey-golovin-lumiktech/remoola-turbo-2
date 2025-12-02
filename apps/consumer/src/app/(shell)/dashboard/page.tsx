import {
  DashboardHeader,
  SummaryCards,
  ActionRow,
  PendingRequestsTable,
  ActivityTimeline,
  ComplianceTasksCard,
  QuickDocsCard,
} from '../../../components/dashboard';
import { apiGet, type DashboardData } from '../../../lib/dashboard-api';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Client Dashboard - Remoola`,
};

export default async function DashboardPage() {
  const dashboardData = await apiGet<DashboardData>(`/dashboard`);

  return (
    <div className="flex h-full flex-col gap-6 px-8 py-6">
      <DashboardHeader />

      <SummaryCards summary={dashboardData.summary} />

      <ActionRow />

      <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
        <PendingRequestsTable items={dashboardData.pendingRequests} />
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
        <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
          <ActivityTimeline items={dashboardData.activity} />
        </div>

        <div className="flex flex-col gap-4">
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
