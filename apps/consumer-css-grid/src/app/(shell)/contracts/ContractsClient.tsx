'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';

import {
  buildContractDetailHref,
  buildContractFilesWorkspaceHref,
  buildEditContactHref,
  resolveContractWorkflowActions,
} from './contract-workflow-actions';
import {
  buildContractsHref,
  type ContractPresenceFilter,
  type ContractSortOption,
  type ContractStatusFilter,
  CONTRACT_PRESENCE_FILTERS,
  CONTRACT_SORT_OPTIONS,
  CONTRACT_STATUS_FILTERS,
} from './contracts-search-params';
import { ActionMini, ChecklistItem, Panel, StatusPill } from '../../../shared/ui/shell-primitives';

type Contract = {
  id: string;
  name: string;
  email: string;
  lastRequestId: string | null;
  lastStatus: string | null;
  lastActivity: string | null;
  docs: number;
  paymentsCount: number;
  completedPaymentsCount: number;
};

type Props = {
  contracts: Contract[];
  total: number;
  page: number;
  pageSize: number;
  initialQuery?: string;
  initialStatus?: ContractStatusFilter;
  initialHasDocuments?: ContractPresenceFilter;
  initialHasPayments?: ContractPresenceFilter;
  initialSort?: ContractSortOption;
};

const CONTRACT_STATUS_LABELS: Record<ContractStatusFilter, string> = {
  all: `All`,
  draft: `Draft`,
  pending: `Pending`,
  waiting: `Waiting`,
  completed: `Completed`,
  no_activity: `No activity`,
};
const CONTRACT_PRESENCE_LABELS: Record<ContractPresenceFilter, string> = {
  all: `All`,
  yes: `Yes`,
  no: `No`,
};
const CONTRACT_SORT_LABELS: Record<ContractSortOption, string> = {
  recent_activity: `Recent activity`,
  name: `Name`,
  payments_count: `Payment volume`,
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
  const normalized = value.replaceAll(`_`, ` `).toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function describeSearchState(
  status: ContractStatusFilter,
  hasDocuments: ContractPresenceFilter,
  hasPayments: ContractPresenceFilter,
  sort: ContractSortOption,
) {
  const parts: string[] = [];
  if (status === `all`) {
    parts.push(`All relationship states remain visible.`);
  } else if (status === `no_activity`) {
    parts.push(`Only contractors without payment history remain visible.`);
  } else {
    parts.push(`Only ${CONTRACT_STATUS_LABELS[status].toLowerCase()} relationships remain visible.`);
  }
  if (hasDocuments !== `all`) {
    parts.push(
      hasDocuments === `yes`
        ? `Only contracts with files remain visible.`
        : `Only contracts without files remain visible.`,
    );
  }
  if (hasPayments !== `all`) {
    parts.push(
      hasPayments === `yes`
        ? `Only contracts with payments remain visible.`
        : `Only contracts without payments remain visible.`,
    );
  }
  parts.push(`Sorted by ${CONTRACT_SORT_LABELS[sort].toLowerCase()}.`);
  return parts.join(` `);
}

export function ContractsClient({
  contracts,
  total,
  page,
  pageSize,
  initialQuery = ``,
  initialStatus = `all`,
  initialHasDocuments = `all`,
  initialHasPayments = `all`,
  initialSort = `recent_activity`,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<ContractStatusFilter>(initialStatus);
  const [hasDocuments, setHasDocuments] = useState<ContractPresenceFilter>(initialHasDocuments);
  const [hasPayments, setHasPayments] = useState<ContractPresenceFilter>(initialHasPayments);
  const [sort, setSort] = useState<ContractSortOption>(initialSort);
  const [isSearchPending, startSearchTransition] = useTransition();

  useEffect(() => {
    setQuery(initialQuery);
    setStatus(initialStatus);
    setHasDocuments(initialHasDocuments);
    setHasPayments(initialHasPayments);
    setSort(initialSort);
  }, [initialHasDocuments, initialHasPayments, initialQuery, initialSort, initialStatus]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const listContextHref = useMemo(() => {
    const currentQuery = searchParams.toString();
    return currentQuery ? `${pathname}?${currentQuery}` : pathname;
  }, [pathname, searchParams]);
  const completedCount = useMemo(
    () => contracts.filter((contract) => contract.lastStatus === `completed`).length,
    [contracts],
  );
  const withLatestPaymentCount = useMemo(
    () => contracts.filter((contract) => contract.lastRequestId != null).length,
    [contracts],
  );
  const withDocumentsCount = useMemo(() => contracts.filter((contract) => contract.docs > 0).length, [contracts]);
  const searchMode =
    initialQuery.trim().length > 0 ||
    initialStatus !== `all` ||
    initialHasDocuments !== `all` ||
    initialHasPayments !== `all` ||
    initialSort !== `recent_activity`;

  const applyFilters = (
    nextQuery: string,
    nextStatus: ContractStatusFilter,
    nextHasDocuments: ContractPresenceFilter,
    nextHasPayments: ContractPresenceFilter,
    nextSort: ContractSortOption,
  ) => {
    startSearchTransition(() => {
      router.push(
        buildContractsHref(pathname, searchParams.toString(), {
          query: nextQuery.trim() || null,
          status: nextStatus === `all` ? null : nextStatus,
          hasDocuments: nextHasDocuments === `all` ? null : nextHasDocuments,
          hasPayments: nextHasPayments === `all` ? null : nextHasPayments,
          sort: nextSort === `recent_activity` ? null : nextSort,
          page: `1`,
          pageSize: String(pageSize),
        }),
      );
    });
  };

  const applyPage = (nextPage: number) => {
    router.push(
      buildContractsHref(pathname, searchParams.toString(), {
        page: String(nextPage),
        pageSize: String(pageSize),
      }),
    );
  };

  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
      <Panel
        title="Contracts workspace"
        aside={`Page ${page} of ${totalPages} · ${contracts.length} shown · ${total} total`}
      >
        {contracts.length === 0 ? (
          <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-10 text-center text-sm text-[var(--app-text-muted)]">
            {searchMode ? `No contracts match the current backend search.` : `No contractor relationships yet.`}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="mb-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_auto_auto]">
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
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === `Enter`) {
                        event.preventDefault();
                        applyFilters(query, status, hasDocuments, hasPayments, sort);
                      }
                    }}
                    placeholder="Search contractors by name or email"
                    aria-label="Search contracts by contact name or email"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-white outline-none ring-blue-500/40 placeholder:text-white/25 focus:border-white/20 focus:ring-2"
                  />
                </div>
                <button
                  type="button"
                  disabled={isSearchPending}
                  onClick={() => applyFilters(query, status, hasDocuments, hasPayments, sort)}
                  className="rounded-2xl bg-blue-500 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSearchPending ? `Searching...` : `Search`}
                </button>
                <button
                  type="button"
                  disabled={isSearchPending}
                  onClick={() => {
                    setQuery(``);
                    setStatus(`all`);
                    setHasDocuments(`all`);
                    setHasPayments(`all`);
                    setSort(`recent_activity`);
                    applyFilters(``, `all`, `all`, `all`, `recent_activity`);
                  }}
                  className="rounded-2xl border border-[color:var(--app-border)] px-4 py-3 font-medium text-[var(--app-text-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear
                </button>
              </div>
              <div className="mt-3 text-sm text-[var(--app-text-muted)]">
                Search is executed on the backend contracts endpoint and stays in the URL for pagination and deep links.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {CONTRACT_STATUS_FILTERS.map((filterStatus) => (
                  <button
                    key={filterStatus}
                    type="button"
                    disabled={isSearchPending}
                    onClick={() => {
                      setStatus(filterStatus);
                      applyFilters(query, filterStatus, hasDocuments, hasPayments, sort);
                    }}
                    className={
                      filterStatus === status
                        ? `rounded-full border border-[var(--app-primary)]/20 bg-[var(--app-primary-soft)] px-3 py-2 text-sm text-[var(--app-primary)]`
                        : `rounded-full border border-[color:var(--app-border)] px-3 py-2 text-sm text-[var(--app-text-soft)] transition hover:bg-[var(--app-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50`
                    }
                  >
                    {CONTRACT_STATUS_LABELS[filterStatus]}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="text-sm text-[var(--app-text-muted)]">
                  <div className="mb-2">Has files</div>
                  <select
                    value={hasDocuments}
                    onChange={(event) => {
                      const nextValue = event.target.value as ContractPresenceFilter;
                      setHasDocuments(nextValue);
                      applyFilters(query, status, nextValue, hasPayments, sort);
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                  >
                    {CONTRACT_PRESENCE_FILTERS.map((filterValue) => (
                      <option key={`has-documents-${filterValue}`} value={filterValue}>
                        {CONTRACT_PRESENCE_LABELS[filterValue]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-[var(--app-text-muted)]">
                  <div className="mb-2">Has payments</div>
                  <select
                    value={hasPayments}
                    onChange={(event) => {
                      const nextValue = event.target.value as ContractPresenceFilter;
                      setHasPayments(nextValue);
                      applyFilters(query, status, hasDocuments, nextValue, sort);
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                  >
                    {CONTRACT_PRESENCE_FILTERS.map((filterValue) => (
                      <option key={`has-payments-${filterValue}`} value={filterValue}>
                        {CONTRACT_PRESENCE_LABELS[filterValue]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-[var(--app-text-muted)]">
                  <div className="mb-2">Sort</div>
                  <select
                    value={sort}
                    onChange={(event) => {
                      const nextValue = event.target.value as ContractSortOption;
                      setSort(nextValue);
                      applyFilters(query, status, hasDocuments, hasPayments, nextValue);
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                  >
                    {CONTRACT_SORT_OPTIONS.map((sortOption) => (
                      <option key={sortOption} value={sortOption}>
                        {CONTRACT_SORT_LABELS[sortOption]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-3 text-sm text-[var(--app-text-muted)]">
                {describeSearchState(initialStatus, initialHasDocuments, initialHasPayments, initialSort)}
              </div>
            </div>

            {contracts.map((contract) => {
              const contractDetailHref = buildContractDetailHref(contract.id, listContextHref);
              const workflowActions = resolveContractWorkflowActions({
                contractId: contract.id,
                email: contract.email,
                status: contract.lastStatus,
                lastRequestId: contract.lastRequestId,
                returnToContractsHref: listContextHref,
              });
              return (
                <div
                  key={contract.id}
                  className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={contractDetailHref}
                        className="font-medium text-[var(--app-text)] transition hover:text-[var(--app-primary)]"
                      >
                        {contract.name}
                      </Link>
                      <div className="mt-1 break-all text-sm text-[var(--app-text-muted)]">{contract.email}</div>
                      <div className="mt-1 text-sm text-[var(--app-text-muted)]">
                        Updated {formatDate(contract.lastActivity)}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--app-text-faint)]">
                        <span className="rounded-full border border-[color:var(--app-border)] px-3 py-1">
                          {contract.docs} doc{contract.docs === 1 ? `` : `s`}
                        </span>
                        <span className="rounded-full border border-[color:var(--app-border)] px-3 py-1">
                          {contract.paymentsCount} payment{contract.paymentsCount === 1 ? `` : `s`}
                        </span>
                        <span className="rounded-full border border-[color:var(--app-border)] px-3 py-1">
                          {contract.completedPaymentsCount} completed
                        </span>
                      </div>
                    </div>
                    <StatusPill status={toDisplayStatus(contract.lastStatus)} />
                  </div>

                  <div className="mt-4 text-sm text-[var(--app-text-muted)]">{workflowActions.title}</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={workflowActions.primaryAction.href}
                      className="rounded-xl border border-[var(--app-primary)]/20 bg-[var(--app-primary-soft)] px-3 py-2 text-sm text-[var(--app-primary)] transition hover:opacity-90"
                    >
                      {workflowActions.primaryAction.label}
                    </Link>
                    {workflowActions.secondaryActions.map((action) => (
                      <Link
                        key={`${contract.id}-${action.label}`}
                        href={action.href}
                        className="rounded-xl border border-[var(--app-primary)]/20 px-3 py-2 text-sm text-[var(--app-primary)] transition hover:bg-[var(--app-primary-soft)]"
                      >
                        {action.label}
                      </Link>
                    ))}
                    <Link
                      href={contractDetailHref}
                      className="rounded-xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[var(--app-text)] transition hover:bg-[var(--app-surface-strong)]"
                    >
                      View contract
                    </Link>
                    <Link
                      href={buildContractFilesWorkspaceHref(contract.id, listContextHref)}
                      className="rounded-xl border border-[color:var(--app-border)] px-3 py-2 text-sm text-[var(--app-text-soft)] transition hover:bg-[var(--app-surface)]"
                    >
                      Open contract files
                    </Link>
                    <Link
                      href={buildEditContactHref(contract.id, listContextHref)}
                      className="rounded-xl border border-[color:var(--app-border)] px-3 py-2 text-sm text-[var(--app-text-soft)] transition hover:bg-[var(--app-surface)]"
                    >
                      Edit contact
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isSearchPending || page <= 1}
            onClick={() => applyPage(page - 1)}
            className="rounded-xl border border-[color:var(--app-border)] px-3 py-2 text-sm text-[var(--app-text-soft)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={isSearchPending || page >= totalPages}
            onClick={() => applyPage(page + 1)}
            className="rounded-xl border border-[color:var(--app-border)] px-3 py-2 text-sm text-[var(--app-text-soft)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </Panel>

      <Panel title="Workspace summary">
        <div className="space-y-3 text-sm text-[var(--app-text-soft)]">
          <ChecklistItem checked={completedCount > 0}>At least one completed payment relationship</ChecklistItem>
          <ChecklistItem checked={withDocumentsCount > 0}>At least one document attached</ChecklistItem>
          <ChecklistItem checked={total > 0}>Contractor contact exists</ChecklistItem>
          <ChecklistItem checked={withLatestPaymentCount > 0}>Latest payment linked</ChecklistItem>
        </div>
        <div className="mt-4 space-y-3">
          <ActionMini
            label={
              searchMode
                ? `${contracts.length} results on this page for "${initialQuery || `current contract filters`}"`
                : `Page ${page} of ${totalPages} · ${contracts.length} shown · ${total} total contracts`
            }
          />
          <ActionMini
            label={describeSearchState(initialStatus, initialHasDocuments, initialHasPayments, initialSort)}
          />
          <ActionMini
            label={`${completedCount} completed relationship${completedCount === 1 ? `` : `s`} on this page`}
          />
          <ActionMini label={`${withDocumentsCount} contract${withDocumentsCount === 1 ? `` : `s`} with documents`} />
        </div>
      </Panel>
    </section>
  );
}
