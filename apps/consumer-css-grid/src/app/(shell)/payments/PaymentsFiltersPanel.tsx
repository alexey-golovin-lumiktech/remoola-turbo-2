'use client';

import { formatRoleLabel } from './payments-list-formatters';
import { formatPaymentTypeLabel, PAYMENT_TYPE_OPTIONS } from './payments-list-query';
import { Panel } from '../../../shared/ui/shell-panel';

const STATUS_OPTIONS = [``, `DRAFT`, `PENDING`, `WAITING`, `COMPLETED`, `DENIED`, `UNCOLLECTIBLE`];
const ROLE_OPTIONS = [``, `PAYER`, `REQUESTER`];

export function PaymentsFiltersPanel({
  applyFilters,
  clearFilters,
  hasActiveFilters,
  isFilterPending,
  role,
  search,
  setRole,
  setSearch,
  setStatus,
  setType,
  status,
  total,
  type,
}: {
  applyFilters: (nextPage?: number) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  isFilterPending: boolean;
  role: string;
  search: string;
  setRole: (value: string) => void;
  setSearch: (value: string) => void;
  setStatus: (value: string) => void;
  setType: (value: string) => void;
  status: string;
  total: number;
  type: string;
}) {
  return (
    <Panel
      title="Payments filters"
      aside={hasActiveFilters ? `${total} total · filters active` : `${total} total`}
      data-testid="payments-filters"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_auto]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by description or counterparty"
          aria-label="Search payments by description or counterparty"
          className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter by payment status"
          className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-strong) px-4 py-3 text-(--app-text) outline-none"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option || `all-statuses`} value={option}>
              {option || `All statuses`}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(event) => setType(event.target.value)}
          aria-label="Filter by payment type"
          className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-strong) px-4 py-3 text-(--app-text) outline-none"
        >
          {PAYMENT_TYPE_OPTIONS.map((option) => (
            <option key={option || `all-types`} value={option}>
              {option ? formatPaymentTypeLabel(option) : `All types`}
            </option>
          ))}
        </select>
        <select
          value={role}
          onChange={(event) => setRole(event.target.value)}
          aria-label="Filter by role"
          className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-strong) px-4 py-3 text-(--app-text) outline-none"
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option || `all-roles`} value={option}>
              {option ? formatRoleLabel(option) : `All roles`}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isFilterPending}
            onClick={() => applyFilters(1)}
            className="rounded-2xl bg-(--app-primary) px-4 py-3 font-medium text-(--app-text) disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isFilterPending ? `Applying...` : `Apply`}
          </button>
          {hasActiveFilters ? (
            <button
              type="button"
              disabled={isFilterPending}
              onClick={clearFilters}
              className="rounded-2xl border border-(--app-border) px-4 py-3 font-medium text-(--app-text-soft) transition hover:border-(--app-border-strong) hover:text-(--app-text) disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </div>
    </Panel>
  );
}
