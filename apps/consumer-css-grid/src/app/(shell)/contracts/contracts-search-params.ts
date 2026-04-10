export type ContractsSearchParams = Record<string, string | string[] | undefined>;
export const CONTRACT_STATUS_FILTERS = [`all`, `draft`, `pending`, `waiting`, `completed`, `no_activity`] as const;
export type ContractStatusFilter = (typeof CONTRACT_STATUS_FILTERS)[number];
export type AppliedContractStatusFilter = Exclude<ContractStatusFilter, `all`>;
export const CONTRACT_PRESENCE_FILTERS = [`all`, `yes`, `no`] as const;
export type ContractPresenceFilter = (typeof CONTRACT_PRESENCE_FILTERS)[number];
export const CONTRACT_SORT_OPTIONS = [`recent_activity`, `name`, `payments_count`] as const;
export type ContractSortOption = (typeof CONTRACT_SORT_OPTIONS)[number];

function getSingleValue(value: string | string[] | undefined) {
  return typeof value === `string` ? value : Array.isArray(value) ? (value[0] ?? ``) : ``;
}

function isContractStatusFilter(value: string): value is ContractStatusFilter {
  return CONTRACT_STATUS_FILTERS.includes(value as ContractStatusFilter);
}

function isContractPresenceFilter(value: string): value is ContractPresenceFilter {
  return CONTRACT_PRESENCE_FILTERS.includes(value as ContractPresenceFilter);
}

function isContractSortOption(value: string): value is ContractSortOption {
  return CONTRACT_SORT_OPTIONS.includes(value as ContractSortOption);
}

export function parseContractsSearchParams(searchParams?: ContractsSearchParams) {
  const rawStatus = getSingleValue(searchParams?.status).trim().toLowerCase();
  const rawHasDocuments = getSingleValue(searchParams?.hasDocuments).trim().toLowerCase();
  const rawHasPayments = getSingleValue(searchParams?.hasPayments).trim().toLowerCase();
  const rawSort = getSingleValue(searchParams?.sort).trim().toLowerCase();
  return {
    page: Math.max(1, Number(getSingleValue(searchParams?.page)) || 1),
    pageSize: Math.max(1, Number(getSingleValue(searchParams?.pageSize)) || 10),
    query: getSingleValue(searchParams?.query).trim(),
    status: isContractStatusFilter(rawStatus) ? rawStatus : `all`,
    hasDocuments: isContractPresenceFilter(rawHasDocuments) ? rawHasDocuments : `all`,
    hasPayments: isContractPresenceFilter(rawHasPayments) ? rawHasPayments : `all`,
    sort: isContractSortOption(rawSort) ? rawSort : `recent_activity`,
  };
}

export function buildContractsHref(pathname: string, searchParams: string, patch: Record<string, string | null>) {
  const params = new URLSearchParams(searchParams);

  for (const [key, value] of Object.entries(patch)) {
    if (value == null || value === ``) {
      params.delete(key);
      continue;
    }
    params.set(key, value);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
