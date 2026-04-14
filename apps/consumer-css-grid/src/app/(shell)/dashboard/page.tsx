import Link from 'next/link';

import { DashboardVerificationAction } from './DashboardVerificationAction';
import { getVerificationBannerState } from './verification-banner';
import { getContextualHelpGuides, HELP_CONTEXT_ROUTE } from '../../../features/help/get-contextual-help-guides';
import { HELP_GUIDE_SLUG } from '../../../features/help/guide-registry';
import { HelpContextualGuides } from '../../../features/help/ui';
import { getAvailableBalances, getBalances, getDashboardData } from '../../../lib/consumer-api.server';
import { HomeIcon } from '../../../shared/ui/icons/HomeIcon';
import {
  ActionCard,
  ChecklistItem,
  MetricCard,
  PageHeader,
  Panel,
  StatusPill,
} from '../../../shared/ui/shell-primitives';

function formatCurrencyFromMinor(amount: number, currencyCode = `USD`) {
  return new Intl.NumberFormat(`en-US`, {
    style: `currency`,
    currency: currencyCode,
  }).format(amount / 100);
}

function formatCurrencyFromMajor(amount: number, currencyCode = `USD`) {
  return new Intl.NumberFormat(`en-US`, {
    style: `currency`,
    currency: currencyCode,
  }).format(amount);
}

function formatDateTime(value: string | null) {
  if (!value) return `—`;
  return new Date(value).toLocaleString(`en-US`, {
    year: `numeric`,
    month: `short`,
    day: `2-digit`,
    hour: `2-digit`,
    minute: `2-digit`,
  });
}

function hasNonZeroMinorBalance(amount: number | undefined) {
  return Math.abs(amount ?? 0) > 0;
}

/* ── Page ────────────────────────────────────────────────── */

export default async function DashboardPage() {
  const [dashboardResult, settledBalances, availableBalances] = await Promise.all([
    getDashboardData({ redirectTo: `/dashboard` }),
    getBalances({ redirectTo: `/dashboard` }),
    getAvailableBalances({ redirectTo: `/dashboard` }),
  ]);
  const dashboard = dashboardResult.data;
  const dashboardUnavailable = dashboardResult.unavailable;
  const summary = dashboard?.summary;
  const settledCurrencyCode = summary?.balanceCurrencyCode ?? `USD`;
  const availableCurrencyCode = summary?.availableBalanceCurrencyCode ?? settledCurrencyCode;
  const pendingRequests = dashboard?.pendingRequests ?? [];
  const pendingWithdrawals = dashboard?.pendingWithdrawals?.items ?? [];
  const quickDocs = dashboard?.quickDocs ?? [];
  const activity = dashboard?.activity ?? [];
  const tasks = dashboard?.tasks ?? [];
  const verification = dashboard?.verification;
  const verificationBanner = getVerificationBannerState(verification, dashboardUnavailable);
  const balanceBreakdown = Array.from(
    new Set([
      ...Object.keys(settledBalances ?? {}).filter((currencyCode) =>
        hasNonZeroMinorBalance(settledBalances?.[currencyCode]),
      ),
      ...Object.keys(availableBalances ?? {}).filter((currencyCode) =>
        hasNonZeroMinorBalance(availableBalances?.[currencyCode]),
      ),
    ]),
  )
    .sort((left, right) => {
      if (left === settledCurrencyCode) return -1;
      if (right === settledCurrencyCode) return 1;

      const leftMagnitude = Math.max(Math.abs(settledBalances?.[left] ?? 0), Math.abs(availableBalances?.[left] ?? 0));
      const rightMagnitude = Math.max(
        Math.abs(settledBalances?.[right] ?? 0),
        Math.abs(availableBalances?.[right] ?? 0),
      );

      if (leftMagnitude !== rightMagnitude) {
        return rightMagnitude - leftMagnitude;
      }

      return left.localeCompare(right);
    })
    .map((currencyCode) => ({
      currencyCode,
      settledCents: settledBalances?.[currencyCode] ?? 0,
      availableCents: availableBalances?.[currencyCode] ?? 0,
      isPrimary: currencyCode === settledCurrencyCode,
    }));
  const showCurrencyBreakdown = !dashboardUnavailable && balanceBreakdown.length > 1;
  const dashboardHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.DASHBOARD,
    preferredSlugs: [
      HELP_GUIDE_SLUG.DASHBOARD_OVERVIEW,
      HELP_GUIDE_SLUG.VERIFICATION_HOW_IT_WORKS,
      HELP_GUIDE_SLUG.GETTING_STARTED_OVERVIEW,
    ],
  });
  const dashboardPaymentsHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.PAYMENTS,
    preferredSlugs: [HELP_GUIDE_SLUG.PAYMENTS_OVERVIEW, HELP_GUIDE_SLUG.PAYMENTS_CREATE_REQUEST],
    limit: 2,
  });
  const dashboardQuickDocsHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.PAYMENTS_NEW_REQUEST,
    preferredSlugs: [HELP_GUIDE_SLUG.DOCUMENTS_UPLOAD_AND_ATTACH, HELP_GUIDE_SLUG.PAYMENTS_CREATE_REQUEST],
    limit: 2,
  });
  const dashboardActivityHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.DASHBOARD,
    preferredSlugs: [HELP_GUIDE_SLUG.DASHBOARD_OVERVIEW],
    limit: 1,
  });

  return (
    <div>
      <PageHeader title="Dashboard" icon={<HomeIcon className="h-10 w-10" />} />

      {dashboardUnavailable ? (
        <section className="mb-5 rounded-[28px] border border-transparent bg-[var(--app-warning-soft)] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.3em] text-[var(--app-warning-text)]">Dashboard sync</div>
              <h2 className="mt-1 text-2xl font-semibold text-[var(--app-text)]">
                Dashboard data is temporarily unavailable
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--app-text-soft)]">
                Navigation and payment flows are still available, but this page could not load live dashboard data from
                the backend right now.
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
      ) : null}

      <HelpContextualGuides
        guides={dashboardHelpGuides}
        title="Use the dashboard as a launch point"
        description="These guides explain the dashboard summary, verification state, and the next route to open when a balance, task, or banner needs attention."
        className="mb-5"
      />

      {/* Metric cards */}
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

      {showCurrencyBreakdown ? (
        <section className="mt-4 rounded-[28px] border border-[color:var(--app-border)] bg-[var(--app-surface)] p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.3em] text-[var(--app-primary)]">Currency breakdown</div>
              <h2 className="mt-1 text-2xl font-semibold text-[var(--app-text)]">
                Multiple wallet currencies are active
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--app-text-soft)]">
                The primary cards stay pinned to {settledCurrencyCode}. Use this breakdown to compare settled and
                spendable balances across each active currency without changing wallet balance semantics.
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
      ) : null}

      {/* Identity verified banner */}
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

      {/* Action cards — 3-col on desktop */}
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

      {/* Main panels — asymmetric 2-col: xl:grid-cols-[1.5fr_1fr] */}
      <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]">
        {/* Left column */}
        <div className="space-y-5">
          <Panel title="Open Payment Requests" aside={`${pendingRequests.length} total`}>
            {pendingRequests.length === 0 ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-10 text-center text-sm text-[var(--app-text-faint)]">
                  No open payment requests yet.
                </div>
                <HelpContextualGuides
                  guides={dashboardPaymentsHelpGuides}
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
                      <div className="text-xs text-[var(--app-text-faint)]">
                        {formatDateTime(request.lastActivityAt)}
                      </div>
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

          {pendingWithdrawals.length > 0 ? (
            <Panel
              title="Pending Withdrawals"
              aside={`${dashboard?.pendingWithdrawals?.total ?? pendingWithdrawals.length} total`}
            >
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
                        <div className="text-xs text-[var(--app-text-faint)]">
                          {formatDateTime(withdrawal.createdAt)}
                        </div>
                      </div>
                      <StatusPill status={withdrawal.status} />
                    </>
                  );
                  const withdrawalHref = withdrawal.paymentRequestId
                    ? `/payments/${withdrawal.paymentRequestId}`
                    : null;

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
          ) : null}

          <Panel title="Activity Timeline">
            {activity.length === 0 ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-10 text-center text-sm text-[var(--app-text-faint)]">
                  No activity yet.
                </div>
                <HelpContextualGuides
                  guides={dashboardActivityHelpGuides}
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
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <Panel title="Tasks – Onboarding / Compliance">
            <div>
              <div className="text-sm text-[var(--app-text-muted)]">
                {tasks.filter((task) => task.completed).length} of {tasks.length} completed
              </div>
              <div className="mt-1 text-sm text-[var(--app-primary)]">
                {tasks.length === 0
                  ? `0% ready`
                  : `${Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100)}% ready`}
              </div>
              <div className="mt-3 h-2.5 rounded-full bg-[var(--app-surface-muted)]">
                <div
                  className="h-2.5 rounded-full bg-[var(--app-primary)]"
                  style={{
                    width:
                      tasks.length === 0
                        ? `0%`
                        : `${(tasks.filter((task) => task.completed).length / tasks.length) * 100}%`,
                  }}
                />
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

          <Panel title="Quick Docs" aside="View all">
            {quickDocs.length === 0 ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-10 text-center text-sm text-[var(--app-text-faint)]">
                  No documents yet.
                </div>
                <HelpContextualGuides
                  guides={dashboardQuickDocsHelpGuides}
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
        </div>
      </section>
    </div>
  );
}
