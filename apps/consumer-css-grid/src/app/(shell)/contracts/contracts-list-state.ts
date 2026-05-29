'use client';

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
} from './contracts-search-params';

export type ContractListItem = {
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

export type ContractListRow = {
  contract: ContractListItem;
  contractDetailHref: string;
  contractFilesHref: string;
  editContactHref: string;
  workflowActions: ReturnType<typeof resolveContractWorkflowActions>;
};

export type ContractListMetrics = {
  completedCount: number;
  withLatestPaymentCount: number;
  withDocumentsCount: number;
};

export type UseContractsListStateInput = {
  contracts: ContractListItem[];
  total: number;
  page: number;
  pageSize: number;
  initialQuery?: string;
  initialStatus?: ContractStatusFilter;
  initialHasDocuments?: ContractPresenceFilter;
  initialHasPayments?: ContractPresenceFilter;
  initialSort?: ContractSortOption;
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatusFilter, string> = {
  all: `All`,
  draft: `Draft`,
  pending: `Pending`,
  waiting: `Waiting`,
  completed: `Completed`,
  no_activity: `No activity`,
};

export const CONTRACT_PRESENCE_LABELS: Record<ContractPresenceFilter, string> = {
  all: `All`,
  yes: `Yes`,
  no: `No`,
};

export const CONTRACT_SORT_LABELS: Record<ContractSortOption, string> = {
  recent_activity: `Recent activity`,
  name: `Name`,
  payments_count: `Payment volume`,
};

export function formatContractActivityDate(value: string | null) {
  if (!value) return `—`;
  return new Date(value).toLocaleDateString(`en-US`, {
    year: `numeric`,
    month: `short`,
    day: `2-digit`,
  });
}

export function formatContractStatus(value: string | null) {
  if (!value) return `No activity`;
  const normalized = value.replaceAll(`_`, ` `).toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function describeContractsSearchState(
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

export function buildContractsListContextHref(pathname: string, searchParams: string) {
  return searchParams ? `${pathname}?${searchParams}` : pathname;
}

export function buildContractsListMetrics(contracts: ContractListItem[]): ContractListMetrics {
  return {
    completedCount: contracts.filter((contract) => contract.lastStatus === `completed`).length,
    withLatestPaymentCount: contracts.filter((contract) => contract.lastRequestId != null).length,
    withDocumentsCount: contracts.filter((contract) => contract.docs > 0).length,
  };
}

export function isContractsListSearchMode(
  initialQuery: string,
  initialStatus: ContractStatusFilter,
  initialHasDocuments: ContractPresenceFilter,
  initialHasPayments: ContractPresenceFilter,
  initialSort: ContractSortOption,
) {
  return (
    initialQuery.trim().length > 0 ||
    initialStatus !== `all` ||
    initialHasDocuments !== `all` ||
    initialHasPayments !== `all` ||
    initialSort !== `recent_activity`
  );
}

function buildContractListRows(contracts: ContractListItem[], listContextHref: string): ContractListRow[] {
  return contracts.map((contract) => {
    const contractDetailHref = buildContractDetailHref(contract.id, listContextHref);

    return {
      contract,
      contractDetailHref,
      contractFilesHref: buildContractFilesWorkspaceHref(contract.id, listContextHref),
      editContactHref: buildEditContactHref(contract.id, listContextHref),
      workflowActions: resolveContractWorkflowActions({
        contractId: contract.id,
        email: contract.email,
        status: contract.lastStatus,
        lastRequestId: contract.lastRequestId,
        returnToContractsHref: listContextHref,
      }),
    };
  });
}

export function useContractsListState({
  contracts,
  total,
  page,
  pageSize,
  initialQuery = ``,
  initialStatus = `all`,
  initialHasDocuments = `all`,
  initialHasPayments = `all`,
  initialSort = `recent_activity`,
}: UseContractsListStateInput) {
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
  const currentSearchParams = searchParams.toString();
  const listContextHref = useMemo(
    () => buildContractsListContextHref(pathname, currentSearchParams),
    [currentSearchParams, pathname],
  );
  const metrics = useMemo(() => buildContractsListMetrics(contracts), [contracts]);
  const searchMode = isContractsListSearchMode(
    initialQuery,
    initialStatus,
    initialHasDocuments,
    initialHasPayments,
    initialSort,
  );
  const rows = useMemo(() => buildContractListRows(contracts, listContextHref), [contracts, listContextHref]);
  const appliedSearchDescription = describeContractsSearchState(
    initialStatus,
    initialHasDocuments,
    initialHasPayments,
    initialSort,
  );

  const applyFilters = (
    nextQuery: string,
    nextStatus: ContractStatusFilter,
    nextHasDocuments: ContractPresenceFilter,
    nextHasPayments: ContractPresenceFilter,
    nextSort: ContractSortOption,
  ) => {
    startSearchTransition(() => {
      router.push(
        buildContractsHref(pathname, currentSearchParams, {
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
      buildContractsHref(pathname, currentSearchParams, {
        page: String(nextPage),
        pageSize: String(pageSize),
      }),
    );
  };

  const clearFilters = () => {
    setQuery(``);
    setStatus(`all`);
    setHasDocuments(`all`);
    setHasPayments(`all`);
    setSort(`recent_activity`);
    applyFilters(``, `all`, `all`, `all`, `recent_activity`);
  };

  return {
    appliedSearchDescription,
    applyFilters,
    applyPage,
    clearFilters,
    contracts,
    currentSearchParams,
    hasDocuments,
    hasPayments,
    initialHasDocuments,
    initialHasPayments,
    initialQuery,
    initialSort,
    initialStatus,
    isSearchPending,
    listContextHref,
    metrics,
    page,
    pageSize,
    pathname,
    query,
    rows,
    searchMode,
    setHasDocuments,
    setHasPayments,
    setQuery,
    setSort,
    setStatus,
    sort,
    status,
    total,
    totalPages,
  };
}

export type ContractsListStateResult = ReturnType<typeof useContractsListState>;
