export type ContractStatusFilter = `draft` | `completed` | `waiting` | `pending` | `no_activity`;
export type ContractPresenceFilter = `yes` | `no`;
export type ContractSortOption = `recent_activity` | `name` | `payments_count`;

const STATUS_FILTERS = new Set<ContractStatusFilter>([`draft`, `completed`, `waiting`, `pending`, `no_activity`]);
const PRESENCE_FILTERS = new Set<ContractPresenceFilter>([`yes`, `no`]);
const SORT_OPTIONS = new Set<ContractSortOption>([`recent_activity`, `name`, `payments_count`]);

export function normalizeContractStatusFilter(value: string | null | undefined): ContractStatusFilter | null {
  const normalized = value?.trim().toLowerCase() ?? ``;
  return STATUS_FILTERS.has(normalized as ContractStatusFilter) ? (normalized as ContractStatusFilter) : null;
}

export function normalizeContractPresenceFilter(value: string | null | undefined): ContractPresenceFilter | null {
  const normalized = value?.trim().toLowerCase() ?? ``;
  return PRESENCE_FILTERS.has(normalized as ContractPresenceFilter) ? (normalized as ContractPresenceFilter) : null;
}

export function normalizeContractSort(value: string | null | undefined): ContractSortOption {
  const normalized = value?.trim().toLowerCase() ?? ``;
  return SORT_OPTIONS.has(normalized as ContractSortOption) ? (normalized as ContractSortOption) : `recent_activity`;
}

export function matchesContractStatusFilter(lastStatus: string | null, filter: ContractStatusFilter | null): boolean {
  if (!filter) {
    return true;
  }
  if (filter === `no_activity`) {
    return lastStatus == null;
  }
  return lastStatus === filter;
}

export function matchesContractPresenceFilter(hasValue: boolean, filter: ContractPresenceFilter | null): boolean {
  if (!filter) {
    return true;
  }
  return filter === `yes` ? hasValue : !hasValue;
}
