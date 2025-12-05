'use client';

import { useEffect, useState } from 'react';

import { VerifyMeButton } from '../stripe';
import { ActionRow } from './ActionRow';
import { ActivityTimeline } from './ActivityTimeline';
import { ComplianceTasksCard } from './ComplianceTasksCard';
import { DashboardHeader } from './DashboardHeader';
import { PendingRequestsTable } from './PendingRequestsTable';
import { PendingWithdrawalsCard } from './PendingWithdrawalsCard';
import { QuickDocsCard } from './QuickDocsCard';
import { SummaryCards } from './SummaryCards';
import { type IDashboardData } from '../../types';

export function DashboardDataView() {
  const [dashboardData, setDashboardData] = useState<IDashboardData>();

  async function fetchDashboardData() {
    const response = await fetch(`/api/dashboard`, {
      method: `GET`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
      cache: `no-store`,
    });
    if (!response.ok) throw new Error(`Fail load dashboard data`);
    const json = await response.json();
    setDashboardData(json);
  }
  useEffect(() => void fetchDashboardData(), []);

  if (!dashboardData) return null;

  return (
    <div className="flex h-full flex-col gap-6 px-8 py-6">
      <DashboardHeader />

      <SummaryCards summary={dashboardData.summary} />
      {/*
      {user.legalVerified ? (
        <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded text-xs">
          ✔ Verified
        </span>
      ) : (
        <VerifyMeButton />
      )} */}

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
