import Link from 'next/link';
import { type ReactElement } from 'react';

import { cn } from '@remoola/ui';

import { Panel } from '../../../components/panel';
import { SignalCard, type SignalCardAvailability } from '../../../components/signal-card';
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

  return (
    <div className="flex flex-col gap-6">
      <section className={cn(`rounded-card border border-border bg-linear-to-br from-bg via-panel to-bg p-6`)}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-cyan-300/80">
              WORKSPACE OVERVIEW
            </span>
            <h1 className="text-2xl font-semibold text-white">Overview</h1>
            <p className="max-w-2xl text-sm text-white/65">
              Overview of active queues, follow-up items, and recent admin actions.
            </p>
          </div>
          <p className="text-xs text-white/45">Computed: {formatDateTime(summary?.computedAt, `—`)}</p>
        </div>
      </section>

      <Panel
        title="Operational pressure"
        description="Core signals that need attention; action-ready cards link to the related workspace."
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

      <Panel title="Additional signals" description="Exchange signals shown alongside the main operational queues.">
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

      <Panel title="Shortcuts" description="One-click shortcuts into the most common investigations.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {visibleQuickstarts.map((item) => (
            <Link
              key={item.id}
              href={buildQuickstartHref(item.targetPath, item.id)}
              className={cn(
                `group flex flex-col gap-2 rounded-card border border-border bg-panel p-4 transition hover:border-cyan-400/30 hover:bg-white/[0.02]`,
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] uppercase tracking-[0.18em] text-white/65">
                  {normalizeQuickstartEyebrow(item.eyebrow)}
                </span>
                <span aria-hidden="true" className="text-xs text-white/45 group-hover:text-cyan-200">
                  →
                </span>
              </div>
              <div className="text-sm font-medium text-white/95 group-hover:text-white">{item.label}</div>
              <div className="text-xs text-white/55">{item.description}</div>
            </Link>
          ))}
        </div>
      </Panel>

      <Panel
        title="Recent admin actions"
        description="Latest admin actions surfaced directly from the admin action log."
        actions={
          recentHref ? (
            <Link
              className={cn(
                `secondaryButton`,
                `inline-flex items-center gap-2 rounded-input border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white/72 hover:text-white/95`,
              )}
              href={recentHref}
            >
              Open audit
            </Link>
          ) : null
        }
        className="tableWrap"
      >
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-white/45">
            <tr>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Resource</th>
              <th className="px-3 py-2">Admin</th>
              <th className="px-3 py-2">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {recentItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-3 text-white/55">
                  No recent admin actions.
                </td>
              </tr>
            ) : null}
            {recentItems.map((item, index) => {
              const row = asRecord(item);
              return (
                <tr key={String(row.id ?? index)} className="text-white/85">
                  <td className="px-3 py-2">{String(row.action ?? `—`)}</td>
                  <td className="px-3 py-2">
                    {String(row.resource ?? `—`)}
                    <div className="text-xs font-mono text-white/55">{String(row.resourceId ?? `—`)}</div>
                  </td>
                  <td className="px-3 py-2">{String(row.adminEmail ?? `—`)}</td>
                  <td className="px-3 py-2">
                    {formatDateTime(typeof row.createdAt === `string` ? row.createdAt : null, `—`)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
