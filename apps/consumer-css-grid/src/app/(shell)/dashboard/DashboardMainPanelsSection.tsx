import Link from 'next/link';
import { type ComponentProps } from 'react';

import { formatCurrencyFromMajor, formatDateTime, getDashboardTasksProgress } from './dashboard-view-model';
import { HelpContextualGuides } from '../../../features/help/ui';
import { type DashboardData } from '../../../lib/consumer-api.server';
import { shellEmptyStateFaint } from '../../../shared/ui/shell-card-tokens';
import { ChecklistItem, StatusPill } from '../../../shared/ui/shell-indicators';
import { shellMainAsideWideMain } from '../../../shared/ui/shell-layout-tokens';
import { Panel } from '../../../shared/ui/shell-panel';

type PendingRequest = DashboardData[`pendingRequests`][number];
type PendingWithdrawal = NonNullable<DashboardData[`pendingWithdrawals`]>[`items`][number];
type DashboardActivity = DashboardData[`activity`][number];
type DashboardTask = DashboardData[`tasks`][number];
type QuickDoc = DashboardData[`quickDocs`][number];
type ContextualHelpGuide = ComponentProps<typeof HelpContextualGuides>[`guides`][number];

export function DashboardMainPanelsSection({
  activity,
  activityHelpGuides,
  paymentsHelpGuides,
  pendingRequests,
  pendingWithdrawals,
  pendingWithdrawalsTotal,
  quickDocs,
  quickDocsHelpGuides,
  tasks,
}: {
  activity: DashboardActivity[];
  activityHelpGuides: ContextualHelpGuide[];
  paymentsHelpGuides: ContextualHelpGuide[];
  pendingRequests: PendingRequest[];
  pendingWithdrawals: PendingWithdrawal[];
  pendingWithdrawalsTotal: number;
  quickDocs: QuickDoc[];
  quickDocsHelpGuides: ContextualHelpGuide[];
  tasks: DashboardTask[];
}) {
  return (
    <section className={`mt-5 ${shellMainAsideWideMain}`}>
      <div className="space-y-5">
        <DashboardPaymentsSection pendingRequests={pendingRequests} paymentsHelpGuides={paymentsHelpGuides} />
        <DashboardPendingWithdrawalsSection
          pendingWithdrawals={pendingWithdrawals}
          pendingWithdrawalsTotal={pendingWithdrawalsTotal}
        />
        <DashboardActivitySection activity={activity} activityHelpGuides={activityHelpGuides} />
      </div>

      <div className="space-y-5">
        <DashboardTasksSection tasks={tasks} />
        <DashboardQuickDocsSection quickDocs={quickDocs} quickDocsHelpGuides={quickDocsHelpGuides} />
      </div>
    </section>
  );
}

function DashboardPaymentsSection({
  paymentsHelpGuides,
  pendingRequests,
}: {
  paymentsHelpGuides: ContextualHelpGuide[];
  pendingRequests: PendingRequest[];
}) {
  return (
    <Panel title="Open Payment Requests" aside={`${pendingRequests.length} total`}>
      {pendingRequests.length === 0 ? (
        <div className="space-y-4">
          <div className={shellEmptyStateFaint}>No open payment requests yet.</div>
          <HelpContextualGuides
            guides={paymentsHelpGuides}
            compact
            title="Need help starting the first payment flow?"
            description="Open the main payments guides to decide whether to create a request or start a payment directly."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {pendingRequests.map((request) => (
            <Link
              key={request.id}
              href={`/payments/${request.id}`}
              className="flex items-center justify-between rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 transition hover:border-(--app-border-strong) hover:bg-(--app-surface)"
            >
              <div>
                <div className="font-medium text-(--app-text)">{request.counterpartyName}</div>
                <div className="text-xs text-(--app-text-faint)">{formatDateTime(request.lastActivityAt)}</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-(--app-text)">
                  {formatCurrencyFromMajor(request.amount, request.currencyCode)}
                </div>
                <span className="text-sm text-(--app-warning-text)">{request.status}</span>
              </div>
            </Link>
          ))}
          <Link href="/payments" className="inline-flex text-sm text-(--app-primary) hover:opacity-80">
            View all payments
          </Link>
        </div>
      )}
    </Panel>
  );
}

function DashboardPendingWithdrawalsSection({
  pendingWithdrawals,
  pendingWithdrawalsTotal,
}: {
  pendingWithdrawals: PendingWithdrawal[];
  pendingWithdrawalsTotal: number;
}) {
  if (pendingWithdrawals.length === 0) return null;

  return (
    <Panel title="Pending Withdrawals" aside={`${pendingWithdrawalsTotal} total`}>
      <div className="space-y-3">
        {pendingWithdrawals.map((withdrawal) => {
          const withdrawalContent = (
            <>
              <div className="min-w-0">
                <div className="font-medium text-(--app-text)">
                  {formatCurrencyFromMajor(withdrawal.amount, withdrawal.currencyCode)}
                </div>
                <div className="truncate text-xs text-(--app-text-muted)">
                  {withdrawal.paymentMethodLabel
                    ? `To ${withdrawal.paymentMethodLabel}`
                    : `Reference ${withdrawal.ledgerId}`}
                </div>
                <div className="text-xs text-(--app-text-faint)">{formatDateTime(withdrawal.createdAt)}</div>
              </div>
              <StatusPill status={withdrawal.status} />
            </>
          );
          const withdrawalHref = withdrawal.paymentRequestId ? `/payments/${withdrawal.paymentRequestId}` : null;

          return withdrawalHref ? (
            <Link
              key={withdrawal.id}
              href={withdrawalHref}
              className="flex items-center justify-between gap-4 rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 transition hover:border-(--app-border-strong) hover:bg-(--app-surface)"
            >
              {withdrawalContent}
            </Link>
          ) : (
            <div
              key={withdrawal.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3"
            >
              {withdrawalContent}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function DashboardActivitySection({
  activity,
  activityHelpGuides,
}: {
  activity: DashboardActivity[];
  activityHelpGuides: ContextualHelpGuide[];
}) {
  return (
    <Panel title="Activity Timeline">
      {activity.length === 0 ? (
        <div className="space-y-4">
          <div className={shellEmptyStateFaint}>No activity yet.</div>
          <HelpContextualGuides
            guides={activityHelpGuides}
            compact
            title="Need help interpreting an empty dashboard?"
            description="This overview explains what the dashboard summarizes and why an empty timeline can still be normal."
          />
        </div>
      ) : (
        <div className="space-y-4">
          {activity.map((item) => (
            <div key={item.id} className="flex gap-3">
              <div className="mt-2 h-2.5 w-2.5 rounded-full bg-(--app-primary)" />
              <div>
                <div className="text-sm font-medium text-(--app-text)">{item.label}</div>
                {item.description ? <div className="text-xs text-(--app-text-muted)">{item.description}</div> : null}
                <div className="text-xs text-(--app-text-faint)">{formatDateTime(item.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function DashboardTasksSection({ tasks }: { tasks: DashboardTask[] }) {
  const progress = getDashboardTasksProgress(tasks);

  return (
    <Panel title="Tasks – Onboarding / Compliance">
      <div>
        <div className="text-sm text-(--app-text-muted)">
          {progress.completed} of {progress.total} completed
        </div>
        <div className="mt-1 text-sm text-(--app-primary)">{progress.label}</div>
        <div className="mt-3 h-2.5 rounded-full bg-(--app-surface-muted)">
          <div className="h-2.5 rounded-full bg-(--app-primary)" style={{ width: `${progress.percent}%` }} />
        </div>
        <div className="mt-4 space-y-3 text-sm">
          {tasks.map((task) => (
            <ChecklistItem key={task.id} checked={task.completed}>
              {task.label}
            </ChecklistItem>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function DashboardQuickDocsSection({
  quickDocs,
  quickDocsHelpGuides,
}: {
  quickDocs: QuickDoc[];
  quickDocsHelpGuides: ContextualHelpGuide[];
}) {
  return (
    <Panel title="Quick Docs" aside="View all">
      {quickDocs.length === 0 ? (
        <div className="space-y-4">
          <div className={shellEmptyStateFaint}>No documents yet.</div>
          <HelpContextualGuides
            guides={quickDocsHelpGuides}
            compact
            title="Need help preparing documents?"
            description="These guides cover uploading files and when documents usually become part of a payment workflow."
          />
        </div>
      ) : (
        <div className="space-y-2">
          {quickDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm"
            >
              <span className="max-w-[75%] truncate text-(--app-text)">{doc.name}</span>
              <span className="text-xs text-(--app-text-faint)">{formatDateTime(doc.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
