import { redirect } from 'next/navigation';
import { type ReactElement } from 'react';

import { cn } from '@remoola/ui';

import { NavIcon } from './nav-icon';

const ID_PREFIX_ROUTES: ReadonlyArray<{ prefix: string; path: (id: string) => string }> = [
  { prefix: `pr_`, path: (id) => `/payments/${id}` },
  { prefix: `le_`, path: (id) => `/ledger/${id}` },
  { prefix: `cs_`, path: (id) => `/consumers/${id}` },
  { prefix: `pm_`, path: (id) => `/payment-methods/${id}` },
  { prefix: `dp_`, path: (id) => `/payouts/${id}` },
  { prefix: `dn_`, path: (id) => `/documents/${id}` },
  { prefix: `ad_`, path: (id) => `/admins/${id}` },
] as const;

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

type ShellSearchFormProps = {
  compact?: boolean;
  className?: string;
};

export function ShellSearchForm({ compact = false, className }: ShellSearchFormProps): ReactElement {
  return (
    <form
      action={searchAction}
      role="search"
      className={cn(
        `flex min-w-0 items-center gap-3 rounded-shell border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]`,
        compact ? `w-full rounded-card` : `flex-1 lg:min-w-[380px]`,
        className,
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill border border-white/8 bg-white/[0.04] text-white/58">
        <NavIcon name="search" />
      </div>
      <input
        type="text"
        name="q"
        placeholder="Search by id, email, payment request, ledger entry…"
        aria-label="Search"
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent text-text placeholder:text-white/40 focus:outline-hidden"
      />
      {!compact ? (
        <span className="hidden rounded-pill border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/48 xl:inline-flex">
          ids, email, case links
        </span>
      ) : null}
      <button type="submit" aria-label="Submit search" className="sr-only">
        Submit
      </button>
    </form>
  );
}
