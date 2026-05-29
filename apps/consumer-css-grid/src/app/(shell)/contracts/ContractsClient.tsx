'use client';

import { ContractsListSections } from './contracts-list-sections';
import { type ContractListItem, useContractsListState } from './contracts-list-state';
import {
  type ContractPresenceFilter,
  type ContractSortOption,
  type ContractStatusFilter,
} from './contracts-search-params';

type Props = {
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
  const state = useContractsListState({
    contracts,
    total,
    page,
    pageSize,
    initialQuery,
    initialStatus,
    initialHasDocuments,
    initialHasPayments,
    initialSort,
  });

  return <ContractsListSections state={state} />;
}
