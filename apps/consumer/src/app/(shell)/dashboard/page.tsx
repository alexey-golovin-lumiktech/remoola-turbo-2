import {
  DashboardHeader,
  SummaryCards,
  ActionRow,
  PendingRequestsTable,
  ActivityTimeline,
  ComplianceTasksCard,
  QuickDocsCard,
} from '../../../components/dashboard';
import { getDashboardData } from '../../../lib/dashboard-api';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Client Dashboard - Remoola`,
};

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="flex h-full flex-col gap-6 px-8 py-6">
      <DashboardHeader />

      <SummaryCards summary={data.summary} />

      <ActionRow />

      <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
        <PendingRequestsTable items={data.pendingRequests} />
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
        <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
          <ActivityTimeline items={data.activity} />
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
            <ComplianceTasksCard tasks={data.tasks} />
          </div>
          <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
            <QuickDocsCard docs={data.quickDocs} />
          </div>
        </div>
      </div>
    </div>
  );
}
