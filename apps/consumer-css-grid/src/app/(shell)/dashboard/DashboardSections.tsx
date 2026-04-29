import Link from 'next/link';
import { type ComponentProps } from 'react';

import {
  type DashboardBalanceBreakdownItem,
  formatCurrencyFromMajor,
  formatCurrencyFromMinor,
  formatDateTime,
  getDashboardTasksProgress,
} from './dashboard-view-model';
import { DashboardVerificationAction } from './DashboardVerificationAction';
import { type VerificationBannerState } from './verification-banner';
import { HELP_GUIDE_SLUG } from '../../../features/help/guide-registry';
import { HelpContextualGuides } from '../../../features/help/ui';
import { type DashboardData } from '../../../lib/consumer-api.server';
import { ActionCard, ChecklistItem, MetricCard, Panel, StatusPill } from '../../../shared/ui/shell-primitives';

type DashboardSummary = DashboardData[`summary`];
type DashboardVerification = DashboardData[`verification`];
type PendingRequest = DashboardData[`pendingRequests`][number];
type PendingWithdrawal = NonNullable<DashboardData[`pendingWithdrawals`]>[`items`][number];
type DashboardActivity = DashboardData[`activity`][number];
type DashboardTask = DashboardData[`tasks`][number];
type QuickDoc = DashboardData[`quickDocs`][number];
type ContextualHelpGuide = ComponentProps<typeof HelpContextualGuides>[`guides`][number];

export function DashboardUnavailableBanner() {
  return (
    <section className="mb-5 rounded-[28px] border border-transparent bg-[var(--app-warning-soft)] p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm uppercase tracking-[0.3em] text-[var(--app-warning-text)]">Dashboard sync</div>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--app-text)]">
            Dashboard data is temporarily unavailable
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--app-text-soft)]">
            Navigation and payment flows are still available, but this page could not load live dashboard data from the
            backend right now.
          </p>
          <Link
            href={`/help/${HELP_GUIDE_SLUG.DASHBOARD_OVERVIEW}`}
            className="mt-3 inline-flex text-sm text-[var(--app-primary)] hover:opacity-80"
          >
            Learn how to read the dashboard and where to continue
          </Link>
        </div>
        <Link
          href="/payments"
          className="inline-flex rounded-full bg-[var(--app-primary)] px-4 py-2 text-sm font-medium text-[var(--app-primary-contrast)]"
        >
          Go to payments
        </Link>
      </div>
    </section>
  );
}

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
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon="◉"
          label="Settled balance"
          value={dashboardUnavailable ? `—` : formatCurrencyFromMinor(summary?.balanceCents ?? 0, settledCurrencyCode)}
          sublabel={dashboardUnavailable ? `Live dashboard data unavailable` : `Completed wallet balance`}
          accent={
            dashboardUnavailable
              ? `text-[var(--app-text)]`
              : (summary?.balanceCents ?? 0) < 0
                ? `text-[var(--app-warning-text)]`
                : `text-[var(--app-success-text)]`
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
              ? `text-[var(--app-text)]`
              : (summary?.availableBalanceCents ?? 0) < 0
                ? `text-[var(--app-warning-text)]`
                : `text-[var(--app-primary)]`
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
        <section className="mt-4 rounded-[24px] border border-[color:var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm text-[var(--app-text-muted)]">
          Settled balance reflects completed wallet entries. Available balance reflects the spendable-now view already
          used by exchange and withdrawal flows.
        </section>
      ) : null}
    </>
  );
}

export function DashboardCurrencyBreakdownSection({
  balanceBreakdown,
  settledCurrencyCode,
}: {
  balanceBreakdown: DashboardBalanceBreakdownItem[];
  settledCurrencyCode: string;
}) {
  if (balanceBreakdown.length <= 1) return null;

  return (
    <section className="mt-4 rounded-[28px] border border-[color:var(--app-border)] bg-[var(--app-surface)] p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm uppercase tracking-[0.3em] text-[var(--app-primary)]">Currency breakdown</div>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--app-text)]">Multiple wallet currencies are active</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--app-text-soft)]">
            The primary cards stay pinned to {settledCurrencyCode}. Use this breakdown to compare settled and spendable
            balances across each active currency without changing wallet balance semantics.
          </p>
        </div>
        <div className="text-sm text-[var(--app-text-muted)]">{balanceBreakdown.length} active currencies</div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {balanceBreakdown.map((currency) => (
          <div
            key={currency.currencyCode}
            className="rounded-[24px] border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-4 text-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold text-[var(--app-text)]">{currency.currencyCode}</div>
              {currency.isPrimary ? (
                <span className="rounded-full border border-transparent bg-[var(--app-primary-soft)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--app-primary)]">
                  Primary summary
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--app-text-faint)]">Settled</div>
                <div className="mt-2 text-base font-medium text-[var(--app-success-text)]">
                  {formatCurrencyFromMinor(currency.settledCents, currency.currencyCode)}
                </div>
                <div className="mt-1 text-xs text-[var(--app-text-muted)]">Completed entries only</div>
              </div>
              <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--app-text-faint)]">Available</div>
                <div className="mt-2 text-base font-medium text-[var(--app-primary)]">
                  {formatCurrencyFromMinor(currency.availableCents, currency.currencyCode)}
                </div>
                <div className="mt-1 text-xs text-[var(--app-text-muted)]">Spendable now</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DashboardVerificationSection({
  dashboardUnavailable,
  verification,
  verificationBanner,
}: {
  dashboardUnavailable: boolean;
  verification: DashboardVerification | undefined;
  verificationBanner: VerificationBannerState;
}) {
  return (
    <section className={`mt-5 rounded-[28px] border p-5 ${verificationBanner.panelClass}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4">
          <div
            className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] ${verificationBanner.iconClass}`}
          >
            <span className="text-4xl">{verificationBanner.icon}</span>
          </div>
          <div>
            <div className="text-sm uppercase tracking-[0.3em] text-[var(--app-primary)]">Verification</div>
            <h2 className="mt-1 text-3xl font-semibold">{verificationBanner.headline}</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--app-text-soft)] md:text-sm">
              {verificationBanner.copy}
            </p>
          </div>
        </div>
        <div className="flex w-full max-w-sm flex-col gap-3 md:items-end">
          <span
            className={`inline-flex rounded-full border px-4 py-2 text-base md:text-sm ${verificationBanner.badgeClass}`}
          >
            {verificationBanner.badge}
          </span>
          <DashboardVerificationAction verification={verification} dashboardUnavailable={dashboardUnavailable} />
        </div>
      </div>
    </section>
  );
}

export function DashboardActionCardsSection() {
  return (
    <section className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
      <ActionCard
        title="Create Payment Request"
        text="Send an invoice-like request in minutes."
        cta="Create"
        href="/payments/new-request"
      />
      <ActionCard
        title="Start Payment"
        text="Create a one-off payer-side payment without waiting for a request."
        cta="Start"
        href="/payments/start"
      />
      <ActionCard
        title="Review Pending Payments"
        text="Open payer-side pending requests and continue card or bank settlement."
        cta="Review"
        highlight
        href="/payments?role=PAYER&status=PENDING"
      />
    </section>
  );
}

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
    <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]">
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
          <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-10 text-center text-sm text-[var(--app-text-faint)]">
            No open payment requests yet.
          </div>
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
              className="flex items-center justify-between rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 transition hover:border-[color:var(--app-border-strong)] hover:bg-[var(--app-surface)]"
            >
              <div>
                <div className="font-medium text-[var(--app-text)]">{request.counterpartyName}</div>
                <div className="text-xs text-[var(--app-text-faint)]">{formatDateTime(request.lastActivityAt)}</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-[var(--app-text)]">
                  {formatCurrencyFromMajor(request.amount, request.currencyCode)}
                </div>
                <span className="text-sm text-[var(--app-warning-text)]">{request.status}</span>
              </div>
            </Link>
          ))}
          <Link href="/payments" className="inline-flex text-sm text-[var(--app-primary)] hover:opacity-80">
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
                <div className="font-medium text-[var(--app-text)]">
                  {formatCurrencyFromMajor(withdrawal.amount, withdrawal.currencyCode)}
                </div>
                <div className="truncate text-xs text-[var(--app-text-muted)]">
                  {withdrawal.paymentMethodLabel
                    ? `To ${withdrawal.paymentMethodLabel}`
                    : `Reference ${withdrawal.ledgerId}`}
                </div>
                <div className="text-xs text-[var(--app-text-faint)]">{formatDateTime(withdrawal.createdAt)}</div>
              </div>
              <StatusPill status={withdrawal.status} />
            </>
          );
          const withdrawalHref = withdrawal.paymentRequestId ? `/payments/${withdrawal.paymentRequestId}` : null;

          return withdrawalHref ? (
            <Link
              key={withdrawal.id}
              href={withdrawalHref}
              className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 transition hover:border-[color:var(--app-border-strong)] hover:bg-[var(--app-surface)]"
            >
              {withdrawalContent}
            </Link>
          ) : (
            <div
              key={withdrawal.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3"
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
          <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-10 text-center text-sm text-[var(--app-text-faint)]">
            No activity yet.
          </div>
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
              <div className="mt-2 h-2.5 w-2.5 rounded-full bg-[var(--app-primary)]" />
              <div>
                <div className="text-sm font-medium text-[var(--app-text)]">{item.label}</div>
                {item.description ? (
                  <div className="text-xs text-[var(--app-text-muted)]">{item.description}</div>
                ) : null}
                <div className="text-xs text-[var(--app-text-faint)]">{formatDateTime(item.createdAt)}</div>
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
        <div className="text-sm text-[var(--app-text-muted)]">
          {progress.completed} of {progress.total} completed
        </div>
        <div className="mt-1 text-sm text-[var(--app-primary)]">{progress.label}</div>
        <div className="mt-3 h-2.5 rounded-full bg-[var(--app-surface-muted)]">
          <div className="h-2.5 rounded-full bg-[var(--app-primary)]" style={{ width: `${progress.percent}%` }} />
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
          <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-10 text-center text-sm text-[var(--app-text-faint)]">
            No documents yet.
          </div>
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
              className="flex items-center justify-between rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-sm"
            >
              <span className="max-w-[75%] truncate text-[var(--app-text)]">{doc.name}</span>
              <span className="text-xs text-[var(--app-text-faint)]">{formatDateTime(doc.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
