'use client';

import Link from 'next/link';

import {
  CONTRACT_PRESENCE_LABELS,
  CONTRACT_SORT_LABELS,
  CONTRACT_STATUS_LABELS,
  formatContractActivityDate,
  formatContractStatus,
  type ContractsListStateResult,
} from './contracts-list-state';
import { CONTRACT_PRESENCE_FILTERS, CONTRACT_SORT_OPTIONS, CONTRACT_STATUS_FILTERS } from './contracts-search-params';
import { shellMainAsidePrimary } from '../../../shared/ui/shell-layout-tokens';
import { ActionMini, ChecklistItem, Panel, StatusPill } from '../../../shared/ui/shell-primitives';

type Props = {
  state: ContractsListStateResult;
};

export function ContractsListSections({ state }: Props) {
  return (
    <section className={shellMainAsidePrimary}>
      <Panel
        title="Contracts workspace"
        aside={`Page ${state.page} of ${state.totalPages} · ${state.contracts.length} shown · ${state.total} total`}
      >
        {state.contracts.length === 0 ? (
          <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-10 text-center text-sm text-(--app-text-muted)">
            {state.searchMode ? `No contracts match the current backend search.` : `No contractor relationships yet.`}
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
                    value={state.query}
                    onChange={(event) => state.setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === `Enter`) {
                        event.preventDefault();
                        state.applyFilters(
                          state.query,
                          state.status,
                          state.hasDocuments,
                          state.hasPayments,
                          state.sort,
                        );
                      }
                    }}
                    placeholder="Search contractors by name or email"
                    aria-label="Search contracts by contact name or email"
                    className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) py-3 pl-10 pr-4 text-(--app-text) outline-none ring-blue-500/40 placeholder:text-(--app-text-faint) focus:border-(--app-border-strong) focus:ring-2"
                  />
                </div>
                <button
                  type="button"
                  disabled={state.isSearchPending}
                  onClick={() =>
                    state.applyFilters(state.query, state.status, state.hasDocuments, state.hasPayments, state.sort)
                  }
                  className="rounded-2xl bg-(--app-primary) px-4 py-3 font-medium text-(--app-text) disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {state.isSearchPending ? `Searching...` : `Search`}
                </button>
                <button
                  type="button"
                  disabled={state.isSearchPending}
                  onClick={state.clearFilters}
                  className="rounded-2xl border border-(--app-border) px-4 py-3 font-medium text-(--app-text-soft) disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear
                </button>
              </div>
              <div className="mt-3 text-sm text-(--app-text-muted)">
                Search is executed on the backend contracts endpoint and stays in the URL for pagination and deep links.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {CONTRACT_STATUS_FILTERS.map((filterStatus) => (
                  <button
                    key={filterStatus}
                    type="button"
                    disabled={state.isSearchPending}
                    onClick={() => {
                      state.setStatus(filterStatus);
                      state.applyFilters(state.query, filterStatus, state.hasDocuments, state.hasPayments, state.sort);
                    }}
                    className={
                      filterStatus === state.status
                        ? `rounded-full border border-(--app-primary)/20 bg-(--app-primary-soft) px-3 py-2 text-sm text-(--app-primary)`
                        : `rounded-full border border-(--app-border) px-3 py-2 text-sm text-(--app-text-soft) transition hover:bg-(--app-surface-muted) disabled:cursor-not-allowed disabled:opacity-50`
                    }
                  >
                    {CONTRACT_STATUS_LABELS[filterStatus]}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="text-sm text-(--app-text-muted)">
                  <div className="mb-2">Has files</div>
                  <select
                    value={state.hasDocuments}
                    onChange={(event) => {
                      const nextValue = event.target.value as typeof state.hasDocuments;
                      state.setHasDocuments(nextValue);
                      state.applyFilters(state.query, state.status, nextValue, state.hasPayments, state.sort);
                    }}
                    className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none"
                  >
                    {CONTRACT_PRESENCE_FILTERS.map((filterValue) => (
                      <option key={`has-documents-${filterValue}`} value={filterValue}>
                        {CONTRACT_PRESENCE_LABELS[filterValue]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-(--app-text-muted)">
                  <div className="mb-2">Has payments</div>
                  <select
                    value={state.hasPayments}
                    onChange={(event) => {
                      const nextValue = event.target.value as typeof state.hasPayments;
                      state.setHasPayments(nextValue);
                      state.applyFilters(state.query, state.status, state.hasDocuments, nextValue, state.sort);
                    }}
                    className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none"
                  >
                    {CONTRACT_PRESENCE_FILTERS.map((filterValue) => (
                      <option key={`has-payments-${filterValue}`} value={filterValue}>
                        {CONTRACT_PRESENCE_LABELS[filterValue]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-(--app-text-muted)">
                  <div className="mb-2">Sort</div>
                  <select
                    value={state.sort}
                    onChange={(event) => {
                      const nextValue = event.target.value as typeof state.sort;
                      state.setSort(nextValue);
                      state.applyFilters(state.query, state.status, state.hasDocuments, state.hasPayments, nextValue);
                    }}
                    className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none"
                  >
                    {CONTRACT_SORT_OPTIONS.map((sortOption) => (
                      <option key={sortOption} value={sortOption}>
                        {CONTRACT_SORT_LABELS[sortOption]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-3 text-sm text-(--app-text-muted)">{state.appliedSearchDescription}</div>
            </div>

            {state.rows.map((row) => (
              <div
                key={row.contract.id}
                className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={row.contractDetailHref}
                      className="font-medium text-(--app-text) transition hover:text-(--app-primary)"
                    >
                      {row.contract.name}
                    </Link>
                    <div className="mt-1 break-all text-sm text-(--app-text-muted)">{row.contract.email}</div>
                    <div className="mt-1 text-sm text-(--app-text-muted)">
                      Updated {formatContractActivityDate(row.contract.lastActivity)}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-(--app-text-faint)">
                      <span className="rounded-full border border-(--app-border) px-3 py-1">
                        {row.contract.docs} doc{row.contract.docs === 1 ? `` : `s`}
                      </span>
                      <span className="rounded-full border border-(--app-border) px-3 py-1">
                        {row.contract.paymentsCount} payment{row.contract.paymentsCount === 1 ? `` : `s`}
                      </span>
                      <span className="rounded-full border border-(--app-border) px-3 py-1">
                        {row.contract.completedPaymentsCount} completed
                      </span>
                    </div>
                  </div>
                  <StatusPill status={formatContractStatus(row.contract.lastStatus)} />
                </div>

                <div className="mt-4 text-sm text-(--app-text-muted)">{row.workflowActions.title}</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={row.workflowActions.primaryAction.href}
                    className="rounded-xl border border-(--app-primary)/20 bg-(--app-primary-soft) px-3 py-2 text-sm text-(--app-primary) transition hover:opacity-90"
                  >
                    {row.workflowActions.primaryAction.label}
                  </Link>
                  {row.workflowActions.secondaryActions.map((action) => (
                    <Link
                      key={`${row.contract.id}-${action.label}`}
                      href={action.href}
                      className="rounded-xl border border-(--app-primary)/20 px-3 py-2 text-sm text-(--app-primary) transition hover:bg-(--app-primary-soft)"
                    >
                      {action.label}
                    </Link>
                  ))}
                  <Link
                    href={row.contractDetailHref}
                    className="rounded-xl border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--app-text) transition hover:bg-(--app-surface-strong)"
                  >
                    View contract
                  </Link>
                  <Link
                    href={row.contractFilesHref}
                    className="rounded-xl border border-(--app-border) px-3 py-2 text-sm text-(--app-text-soft) transition hover:bg-(--app-surface)"
                  >
                    Open contract files
                  </Link>
                  <Link
                    href={row.editContactHref}
                    className="rounded-xl border border-(--app-border) px-3 py-2 text-sm text-(--app-text-soft) transition hover:bg-(--app-surface)"
                  >
                    Edit contact
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={state.isSearchPending || state.page <= 1}
            onClick={() => state.applyPage(state.page - 1)}
            className="rounded-xl border border-(--app-border) px-3 py-2 text-sm text-(--app-text-soft) disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={state.isSearchPending || state.page >= state.totalPages}
            onClick={() => state.applyPage(state.page + 1)}
            className="rounded-xl border border-(--app-border) px-3 py-2 text-sm text-(--app-text-soft) disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </Panel>

      <Panel title="Workspace summary">
        <div className="space-y-3 text-sm text-(--app-text-soft)">
          <ChecklistItem checked={state.metrics.completedCount > 0}>
            At least one completed payment relationship
          </ChecklistItem>
          <ChecklistItem checked={state.metrics.withDocumentsCount > 0}>At least one document attached</ChecklistItem>
          <ChecklistItem checked={state.total > 0}>Contractor contact exists</ChecklistItem>
          <ChecklistItem checked={state.metrics.withLatestPaymentCount > 0}>Latest payment linked</ChecklistItem>
        </div>
        <div className="mt-4 space-y-3">
          <ActionMini
            label={
              state.searchMode
                ? `${state.contracts.length} results on this page for "${state.initialQuery || `current contract filters`}"`
                : `Page ${state.page} of ${state.totalPages} · ${state.contracts.length} shown · ${state.total} total contracts`
            }
          />
          <ActionMini label={state.appliedSearchDescription} />
          <ActionMini
            label={`${state.metrics.completedCount} completed relationship${state.metrics.completedCount === 1 ? `` : `s`} on this page`}
          />
          <ActionMini
            label={`${state.metrics.withDocumentsCount} contract${state.metrics.withDocumentsCount === 1 ? `` : `s`} with documents`}
          />
        </div>
      </Panel>
    </section>
  );
}
