'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { ChecklistItem, Panel, StatusPill } from '../../../shared/ui/shell-primitives';

type Contract = {
  id: string;
  name: string;
  email: string;
  lastRequestId: string | null;
  lastStatus: string | null;
  lastActivity: string | null;
  docs: number;
};

type Props = {
  contracts: Contract[];
  total: number;
  page: number;
  pageSize: number;
};

function formatDate(value: string | null) {
  if (!value) return `—`;
  return new Date(value).toLocaleDateString(`en-US`, {
    year: `numeric`,
    month: `short`,
    day: `2-digit`,
  });
}

function toDisplayStatus(value: string | null) {
  if (!value) return `No activity`;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function ContractsClient({ contracts, total, page, pageSize }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(``);

  const filteredContracts = useMemo(() => {
    if (!searchQuery.trim()) return contracts;
    const q = searchQuery.toLowerCase();
    return contracts.filter(
      (c) => c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.id?.toLowerCase().includes(q),
    );
  }, [contracts, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const applyPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(`page`, String(nextPage));
    params.set(`pageSize`, String(pageSize));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
      <Panel
        title="Contracts overview"
        aside={`Page ${page} of ${totalPages} · ${contracts.length} shown · ${total} total`}
      >
        {contracts.length === 0 ? (
          <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-10 text-center text-sm text-[var(--app-text-muted)]">
            No contractor relationships yet.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="mb-4">
              <div className="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                    clipRule="evenodd"
                  />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contractors..."
                  aria-label="Search contractors by name, email, or ID"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-white outline-none ring-blue-500/40 placeholder:text-white/25 focus:border-white/20 focus:ring-2"
                />
              </div>
            </div>
            {filteredContracts.map((contract) => (
              <div
                key={contract.id}
                className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-[var(--app-text)]">{contract.name}</div>
                    <div className="mt-1 text-sm text-[var(--app-text-muted)]">{contract.email}</div>
                    <div className="mt-1 text-sm text-[var(--app-text-muted)]">
                      Updated {formatDate(contract.lastActivity)}
                    </div>
                  </div>
                  <StatusPill status={toDisplayStatus(contract.lastStatus)} />
                </div>
              </div>
            ))}
            {filteredContracts.length === 0 && searchQuery.trim() && (
              <div className="py-12 text-center text-sm text-white/40">
                No contractors matching &ldquo;{searchQuery}&rdquo;
              </div>
            )}
          </div>
        )}

        {!searchQuery.trim() && (
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => applyPage(page - 1)}
              className="rounded-xl border border-[color:var(--app-border)] px-3 py-2 text-sm text-[var(--app-text-soft)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => applyPage(page + 1)}
              className="rounded-xl border border-[color:var(--app-border)] px-3 py-2 text-sm text-[var(--app-text-soft)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </Panel>

      <Panel title="Required next steps">
        <div className="space-y-3 text-sm text-[var(--app-text-soft)]">
          <ChecklistItem checked={contracts.some((contract) => contract.lastStatus === `completed`)}>
            At least one completed payment relationship
          </ChecklistItem>
          <ChecklistItem checked={contracts.some((contract) => contract.docs > 0)}>
            At least one document attached
          </ChecklistItem>
          <ChecklistItem checked={total > 0}>Contractor contact exists</ChecklistItem>
          <ChecklistItem checked={contracts.some((contract) => contract.lastRequestId != null)}>
            Latest payment linked
          </ChecklistItem>
        </div>
      </Panel>
    </section>
  );
}
