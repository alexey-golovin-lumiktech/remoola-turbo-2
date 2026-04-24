import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { type ReactElement } from 'react';

import { cn } from '@remoola/ui';

import { ActionGhost } from '@/components/action-ghost';
import { ActionPrimary } from '@/components/action-primary';

import { NavIcon } from './nav-icon';
import { panelSurfaceClass } from './ui-classes';
import { getActivePathFromHeaders } from '../app/(shell)/nav-state';

const ID_PREFIX_ROUTES: ReadonlyArray<{ prefix: string; path: (id: string) => string }> = [
  { prefix: `pr_`, path: (id) => `/payments/${id}` },
  { prefix: `le_`, path: (id) => `/ledger/${id}` },
  { prefix: `cs_`, path: (id) => `/consumers/${id}` },
  { prefix: `pm_`, path: (id) => `/payment-methods/${id}` },
  { prefix: `dp_`, path: (id) => `/payouts/${id}` },
  { prefix: `dn_`, path: (id) => `/documents/${id}` },
  { prefix: `ad_`, path: (id) => `/admins/${id}` },
];

async function searchAction(formData: FormData): Promise<void> {
  'use server';

  const raw = formData.get(`q`);
  if (typeof raw !== `string`) {
    redirect(`/overview`);
  }

  const q = raw.trim();
  if (q.length === 0) {
    redirect(`/overview`);
  }

  for (const route of ID_PREFIX_ROUTES) {
    if (q.startsWith(route.prefix)) {
      redirect(route.path(q));
    }
  }

  if (q.includes(`@`)) {
    redirect(`/consumers?q=${encodeURIComponent(q)}`);
  }

  redirect(`/payments?q=${encodeURIComponent(q)}`);
}

const WORKSPACE_TITLE_BY_PREFIX: ReadonlyArray<{ prefix: string; title: string }> = [
  { prefix: `/overview`, title: `Overview` },
  { prefix: `/consumers`, title: `Consumers` },
  { prefix: `/verification`, title: `Verification` },
  { prefix: `/payments/operations`, title: `Payments · Operations` },
  { prefix: `/payments`, title: `Payments` },
  { prefix: `/ledger/anomalies`, title: `Ledger · Anomalies` },
  { prefix: `/ledger`, title: `Ledger and Disputes` },
  { prefix: `/audit/auth`, title: `Audit · Auth` },
  { prefix: `/audit/admin-actions`, title: `Audit · Admin Actions` },
  { prefix: `/audit/consumer-actions`, title: `Audit · Consumer Actions` },
  { prefix: `/audit`, title: `Audit` },
  { prefix: `/exchange/rates`, title: `Exchange · Rates` },
  { prefix: `/exchange/rules`, title: `Exchange · Rules` },
  { prefix: `/exchange/scheduled`, title: `Exchange · Scheduled` },
  { prefix: `/exchange`, title: `Exchange` },
  { prefix: `/documents/tags`, title: `Documents · Tags` },
  { prefix: `/documents`, title: `Documents` },
  { prefix: `/payouts`, title: `Payouts` },
  { prefix: `/payment-methods`, title: `Payment Methods` },
  { prefix: `/system/alerts`, title: `System · Alerts` },
  { prefix: `/system`, title: `System` },
  { prefix: `/admins`, title: `Admins` },
  { prefix: `/me/sessions`, title: `My Sessions` },
];

function getWorkspaceTitle(path: string | null): string {
  if (!path) return ``;
  for (const entry of WORKSPACE_TITLE_BY_PREFIX) {
    if (path === entry.prefix || path.startsWith(`${entry.prefix}/`)) return entry.title;
  }
  return ``;
}

async function safeGetActivePath(): Promise<string | null> {
  try {
    const headerStore = await headers();
    return getActivePathFromHeaders(headerStore);
  } catch {
    return null;
  }
}

export async function ShellHeader(): Promise<ReactElement> {
  const path = await safeGetActivePath();
  const workspaceTitle = getWorkspaceTitle(path);

  return (
    <header
      className={cn(
        panelSurfaceClass,
        `sticky top-0 z-30 hidden border-border bg-bg/85 px-5 py-4 backdrop-blur-md md:block`,
      )}
    >
      <div className="flex items-center gap-2 text-xs text-white/40">
        <span>Admin v2</span>
        <span>/</span>
        <span>{workspaceTitle || `Console`}</span>
        <span>/</span>
        <span className="text-cyan-300/80">workspace</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <form
          action={searchAction}
          role="search"
          className={cn(
            `flex min-w-[360px] flex-1 items-center gap-3 rounded-shell border border-border bg-white/[0.03] px-4 py-2.5 text-sm text-white/60`,
          )}
        >
          <NavIcon name="search" />
          <input
            type="text"
            name="q"
            placeholder="Search by id, email, payment request, ledger entry…"
            aria-label="Search"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-text placeholder:text-white/40 focus:outline-hidden"
          />
          <button type="submit" aria-label="Submit search" className="sr-only">
            Submit
          </button>
        </form>
        <ActionGhost href="/audit/auth">
          <NavIcon name="eye" />
          <span>Audit</span>
        </ActionGhost>
        <ActionGhost href="/payments/operations">
          <NavIcon name="flag" />
          <span>Review queue</span>
        </ActionGhost>
        <ActionPrimary href="/me/sessions" ariaDisabled title="Coming soon">
          <NavIcon name="plus" />
          <span>New case</span>
        </ActionPrimary>
      </div>
    </header>
  );
}
