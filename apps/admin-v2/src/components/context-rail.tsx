import Link from 'next/link';
import { type ReactElement } from 'react';

import { cn } from '@remoola/ui';

import { ChecklistItem } from './checklist-item';
import { type ContextRailEntry, type WorkspaceKey } from './context-rail-data';
import { ContextStat } from './context-stat';
import { Panel } from './panel';

type ContextRailProps = {
  entry: ContextRailEntry;
};

const workspaceHrefByKey: Record<WorkspaceKey, string> = {
  overview: `/overview`,
  consumers: `/consumers`,
  verification: `/verification`,
  payments: `/payments`,
  ledger: `/ledger`,
  payouts: `/payouts`,
  'payment-methods': `/payment-methods`,
  exchange: `/exchange/rates`,
  documents: `/documents`,
  'audit/auth': `/audit/auth`,
  'audit/admin-actions': `/audit/admin-actions`,
  'audit/consumer-actions': `/audit/consumer-actions`,
  admins: `/admins`,
  system: `/system`,
};

const DEFAULT_GUARDRAILS: Array<Required<NonNullable<ContextRailEntry[`guardrails`]>>[number]> = [
  {
    label: `Idempotent operations`,
    description: `Повтор не должен создавать вторую побочную запись или переход.`,
    status: `ready`,
  },
  {
    label: `Append-only audit`,
    description: `Каждое операторское действие оставляет прослеживаемый след.`,
    status: `ready`,
  },
  {
    label: `RBAC scoped`,
    description: `Доступ ограничен ролью и границами текущего воркспейса.`,
    status: `ready`,
  },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, `-`)
    .replace(/^-+|-+$/g, ``);
}

function countOperators(groups: string[]): string {
  const count = groups
    .flatMap((group) => group.split(`,`))
    .map((part) => part.trim())
    .filter(Boolean).length;

  return count === 1 ? `1 operator` : `${count} operators`;
}

function iconForStatus(status: NonNullable<Required<NonNullable<ContextRailEntry[`guardrails`]>>[number][`status`]>) {
  if (status === `blocked`) {
    return `x`;
  }

  return status === `planned` ? `dot` : `check`;
}

export function ContextRail({ entry }: ContextRailProps): ReactElement {
  const guardrails = entry.guardrails && entry.guardrails.length > 0 ? entry.guardrails : DEFAULT_GUARDRAILS;
  const workspaceHref = workspaceHrefByKey[entry.workspace];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-card border border-border bg-panel px-4 py-4">
        <span className="text-[11px] font-semibold tracking-[0.22em] text-cyan-300/80">CONTEXT</span>
        <h3 className="text-base font-semibold text-text">{entry.title}</h3>
        <p className="text-sm text-muted-56">{entry.goal}</p>
      </div>

      <Panel
        title="Linked context"
        description="Operators and lifecycle scope."
        className="flex flex-col gap-4 border-border bg-panel"
      >
        <div className="grid grid-cols-1 gap-3">
          <ContextStat label="Primary operators" value={countOperators(entry.primaryOperators)} />
          <ContextStat label="Secondary operators" value={countOperators(entry.secondaryOperators)} />
          <ContextStat label="Earliest active phase" value={entry.earliestActivePhase} tone="cyan" />
        </div>
      </Panel>

      <Panel
        title="Jump paths"
        description="What to look at first."
        className="flex flex-col gap-4 border-border bg-panel"
      >
        <ul className="flex flex-col gap-2">
          {entry.whatToLookAtFirst.map((item) => (
            <li key={item}>
              <Link
                href={`${workspaceHref}?focus=${slugify(item)}`}
                className={cn(
                  `flex items-center justify-between gap-3 rounded-input border border-border bg-panel-muted px-3 py-2 text-sm text-muted-72 transition`,
                  `hover:border-border-strong hover:bg-panel-elevated hover:text-text`,
                )}
              >
                <span>{item}</span>
                <span aria-hidden="true" className="text-xs text-muted-40">
                  Open
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="Guardrails"
        description="Invariants that should remain true while operators investigate."
        className="flex flex-col gap-4 border-border bg-panel"
      >
        <ul className="flex flex-col gap-3">
          {guardrails.map((guardrail) => {
            const status = guardrail.status ?? `ready`;

            return (
              <ChecklistItem
                key={guardrail.label}
                icon={iconForStatus(status)}
                label={guardrail.label}
                description={guardrail.description}
                status={status}
              />
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
