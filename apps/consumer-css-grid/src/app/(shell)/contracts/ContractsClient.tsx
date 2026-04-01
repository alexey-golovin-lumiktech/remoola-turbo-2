'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

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
            {contracts.map((contract) => (
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
          </div>
        )}

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
