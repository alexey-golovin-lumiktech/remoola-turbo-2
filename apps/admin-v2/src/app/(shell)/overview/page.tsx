import Link from 'next/link';
import { type ReactElement } from 'react';

import { cn } from '@remoola/ui';

import { ActionGhost } from '../../../components/action-ghost';
import { DenseTable } from '../../../components/dense-table';
import { Panel } from '../../../components/panel';
import { SignalCard, type SignalCardAvailability } from '../../../components/signal-card';
import { TinyPill } from '../../../components/tiny-pill';
import { getAdminIdentity, getOverviewSummary, getQuickstarts } from '../../../lib/admin-api.server';
import { formatDateTime } from '../../../lib/admin-format';
import {
  buildQuickstartHref,
  filterQuickstartsForWorkspaces,
  normalizeQuickstartEyebrow,
} from '../../../lib/quickstart-investigations';

function asRecord(value: unknown): Record<string, unknown> {
  return (value && typeof value === `object` ? value : {}) as Record<string, unknown>;
}

function readCount(signal: Record<string, unknown>): number | null {
  return typeof signal.count === `number` ? signal.count : null;
}

function readSlaBreached(signal: Record<string, unknown>): number | null {
  return typeof signal.slaBreachedCount === `number` ? signal.slaBreachedCount : null;
}

function readPhaseStatus(signal: Record<string, unknown>): string | null {
  return typeof signal.phaseStatus === `string` ? signal.phaseStatus : null;
}

function readAvailability(signal: Record<string, unknown>): SignalCardAvailability {
  return typeof signal.availability === `string` ? (signal.availability as SignalCardAvailability) : ``;
}

function readHref(signal: Record<string, unknown>): string | null {
  return typeof signal.href === `string` && signal.href.length > 0 ? signal.href : null;
}

function readLabel(signal: Record<string, unknown>, fallback: string): string {
  return typeof signal.label === `string` ? signal.label : fallback;
}

export default async function OverviewPage(): Promise<ReactElement> {
  const [identity, summary, quickstarts] = await Promise.all([
    getAdminIdentity(),
    getOverviewSummary(),
    getQuickstarts(`overview`),
  ]);
  const visibleQuickstarts = filterQuickstartsForWorkspaces(quickstarts, identity?.workspaces);
  const signals = asRecord(summary?.signals);
  const activeSignalOrder = [
    `pendingVerifications`,
    `recentAdminActions`,
    `suspiciousAuthEvents`,
    `overduePaymentRequests`,
    `uncollectiblePaymentRequests`,
    `openDisputes`,
    `ledgerAnomalies`,
  ];
  const breadthSignalOrder = [`failedScheduledConversions`, `staleExchangeRates`];
  const activeStatKeys = activeSignalOrder.filter((key) => key !== `recentAdminActions`);
  const recentAdminActions = asRecord(signals.recentAdminActions);
  const recentItems = Array.isArray(recentAdminActions.items) ? recentAdminActions.items : [];
  const recentHref = readHref(recentAdminActions);
  const activeSignals = activeStatKeys.map((key) => asRecord(signals[key]));
  const actionReadySignals = activeSignals.filter((signal) => readAvailability(signal) === `live-actionable`).length;
  const activePressureCount = activeSignals.reduce((sum, signal) => sum + (readCount(signal) ?? 0), 0);
  const breadthSignals = breadthSignalOrder.map((key) => asRecord(signals[key]));
  const secondarySignalCount = breadthSignals.reduce((sum, signal) => sum + (readCount(signal) ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <section
        className={cn(`rounded-card border border-border bg-linear-to-br from-bg via-panel to-bg p-6 shadow-xs`)}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-300/80">
                WORKSPACE OVERVIEW
              </span>
              <h1 className="text-2xl font-semibold text-white">Overview</h1>
              <p className="max-w-2xl text-sm text-white/65">
                Overview of active queues, follow-up items, and recent admin actions.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <TinyPill tone="cyan">{actionReadySignals} live workspaces</TinyPill>
              <TinyPill>{visibleQuickstarts.length} shortcuts</TinyPill>
              <TinyPill>{recentItems.length} recent actions</TinyPill>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.06] p-4">
              <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/70">Operational pressure</div>
              <div className="mt-2 text-3xl font-semibold text-white">{activePressureCount}</div>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Visible items across the core action-ready investigation queues.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">Reference breadth</div>
              <div className="mt-2 text-3xl font-semibold text-white">{secondarySignalCount}</div>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Exchange-adjacent signals kept outside the primary pressure grid.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">Snapshot freshness</div>
              <div className="mt-2 text-sm font-medium text-white">
                Computed {formatDateTime(summary?.computedAt, `—`)}
              </div>
              <p className="mt-2 text-sm leading-6 text-white/60">
                Use this page for triage, then move into queue surfaces for exact case handling.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Panel
        title="Operational pressure"
        description="Core signals that need attention next; action-ready cards open the queue or investigation path directly."
        actions={<TinyPill tone="cyan">{activePressureCount} visible items</TinyPill>}
        surface="primary"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {activeStatKeys.map((key) => {
            const signal = asRecord(signals[key]);
            return (
              <SignalCard
                key={key}
                label={readLabel(signal, key)}
                count={readCount(signal)}
                href={readHref(signal)}
                availability={readAvailability(signal)}
                phaseStatus={readPhaseStatus(signal)}
                slaBreachedCount={readSlaBreached(signal)}
              />
            );
          })}
        </div>
      </Panel>

      <Panel
        title="Recommended investigation starts"
        description="Problem-first shortcuts into the most common queues and regulated audit trails."
        surface="support"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleQuickstarts.map((item) => (
            <Link
              key={item.id}
              href={buildQuickstartHref(item.targetPath, item.id)}
              className={cn(
                `group flex min-h-[148px] flex-col gap-3 rounded-card border border-white/10 bg-white/[0.03] p-4 shadow-xs transition hover:border-cyan-400/30 hover:bg-white/[0.02]`,
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex rounded-full border border-cyan-400/15 bg-cyan-500/[0.08] px-2.5 py-0.5 text-[11px] uppercase tracking-[0.18em] text-cyan-100/85">
                  {normalizeQuickstartEyebrow(item.eyebrow)}
                </span>
                <span aria-hidden="true" className="text-xs text-white/45 group-hover:text-cyan-200">
                  →
                </span>
              </div>
              <div className="text-sm font-medium text-white/95 group-hover:text-white">{item.label}</div>
              <div className="text-xs leading-5 text-white/55">{item.description}</div>
            </Link>
          ))}
        </div>
      </Panel>

      <Panel
        title="Breadth signals outside the pressure grid"
        description="Reference or secondary signals that should stay visible without competing with the main queues."
        actions={<TinyPill>{secondarySignalCount} reference items</TinyPill>}
        surface="meta"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {breadthSignalOrder.map((key) => {
            const signal = asRecord(signals[key]);
            return (
              <SignalCard
                key={key}
                label={readLabel(signal, key)}
                count={readCount(signal)}
                href={readHref(signal)}
                availability={readAvailability(signal)}
                phaseStatus={readPhaseStatus(signal)}
                slaBreachedCount={readSlaBreached(signal)}
              />
            );
          })}
        </div>
      </Panel>

      <Panel
        title="Recent admin actions"
        description="Latest admin actions surfaced directly from the admin action log."
        actions={recentHref ? <ActionGhost href={recentHref}>Open audit trail</ActionGhost> : null}
        surface="meta"
      >
        <DenseTable headers={[`Action`, `Resource`, `Admin`, `Created`]} emptyMessage="No recent admin actions.">
          {recentItems.map((item, index) => {
            const row = asRecord(item);
            return (
              <tr key={String(row.id ?? index)} className="text-white/85">
                <td className="px-3 py-3">
                  <div className="font-medium text-white">{String(row.action ?? `—`)}</div>
                </td>
                <td className="px-3 py-3">
                  <div>{String(row.resource ?? `—`)}</div>
                  <div className="text-xs font-mono text-white/55">{String(row.resourceId ?? `—`)}</div>
                </td>
                <td className="px-3 py-3">{String(row.adminEmail ?? `—`)}</td>
                <td className="px-3 py-3">
                  {formatDateTime(typeof row.createdAt === `string` ? row.createdAt : null, `—`)}
                </td>
              </tr>
            );
          })}
        </DenseTable>
      </Panel>
    </div>
  );
}
