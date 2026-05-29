'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { buildPaymentsListQuery } from './payments-list-query';
import { type PaymentsResponse } from '../../../lib/consumer-api.server';

type Input = {
  pageSize: number;
  initialSearch: string;
  initialStatus: string;
  initialType: string;
  initialRole: string;
};

export function buildPaymentsPageMetrics(payments: PaymentsResponse[`items`], total: number, pageSize: number) {
  const distinctCurrencies = Array.from(new Set(payments.map((payment) => payment.currencyCode)));
  const incomingAmount = payments
    .filter((payment) => payment.role === `REQUESTER`)
    .reduce((sum, payment) => sum + payment.amount, 0);
  const outgoingAmount = payments
    .filter((payment) => payment.role === `PAYER`)
    .reduce((sum, payment) => sum + payment.amount, 0);
  const incomingCount = payments.filter((payment) => payment.role === `REQUESTER`).length;
  const outgoingCount = payments.filter((payment) => payment.role === `PAYER`).length;
  const processingCount = payments.filter((payment) => payment.status.toLowerCase() !== `completed`).length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    distinctCurrencies,
    hasSingleCurrency: distinctCurrencies.length === 1,
    incomingAmount,
    incomingCount,
    outgoingAmount,
    outgoingCount,
    processingCount,
    totalPages,
  };
}

export function usePaymentsFiltersState({ pageSize, initialSearch, initialStatus, initialType, initialRole }: Input) {
  const router = useRouter();
  const pathname = usePathname();
  const [isFilterPending, startFilterTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [type, setType] = useState(initialType);
  const [role, setRole] = useState(initialRole);
  const hasActiveFilters = search !== `` || status !== `` || type !== `` || role !== ``;

  const applyFilters = (nextPage = 1) => {
    const params = buildPaymentsListQuery({
      search,
      status,
      type,
      role,
      page: nextPage,
      pageSize,
    });
    startFilterTransition(() => {
      router.push(`${pathname}?${params}`);
    });
  };

  const clearFilters = () => {
    setSearch(``);
    setStatus(``);
    setType(``);
    setRole(``);

    const params = buildPaymentsListQuery({
      search: ``,
      status: ``,
      type: ``,
      role: ``,
      page: 1,
      pageSize,
    });

    startFilterTransition(() => {
      router.push(`${pathname}?${params}`);
    });
  };

  return {
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
    type,
  };
}
