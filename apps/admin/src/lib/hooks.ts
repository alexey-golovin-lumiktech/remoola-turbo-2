import { useEffect, useState } from 'react';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

import { mutationFetcher, swrFetcher } from './swr-config';
import {
  queryKeys,
  type ActionAuditItem,
  type AdminDetails,
  type AdminMe,
  type AuthAuditItem,
  type Consumer,
  type PaymentRequest,
  type LedgerEntry,
  type PaginatedResponse,
  type DashboardStats,
  type PaymentRequestsByStatus,
  type RecentPaymentRequest,
  type LedgerAnomaly,
  type VerificationQueueItem,
} from './types';

/** Debounced value for search; empty string syncs immediately (no delay). */
export function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    if (value === ``) {
      setDebounced(``);
      return;
    }
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

// Auth hooks
export function useAuth() {
  return useSWR<AdminMe>(queryKeys.auth.me(), {
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });
}

// Build admins list URL with query params so search/filters always work
function adminsListUrl(filters?: {
  includeDeleted?: boolean;
  q?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}): string {
  const params = new URLSearchParams();
  if (filters) {
    if (filters.includeDeleted === true) params.set(`includeDeleted`, `true`);
    if (filters.q != null && String(filters.q).trim() !== ``) params.set(`q`, String(filters.q).trim());
    if (filters.type != null && String(filters.type).trim() !== ``) params.set(`type`, String(filters.type).trim());
    if (filters.page != null && Number.isFinite(filters.page)) params.set(`page`, String(filters.page));
    if (filters.pageSize != null && Number.isFinite(filters.pageSize)) params.set(`pageSize`, String(filters.pageSize));
  }
  const search = params.toString();
  return `/api/admins${search ? `?${search}` : ``}`;
}

// Admin hooks
export function useAdmins(filters?: {
  includeDeleted?: boolean;
  q?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}) {
  return useSWR<PaginatedResponse<AdminDetails>>(adminsListUrl(filters), swrFetcher, {
    keepPreviousData: true,
  });
}

export function useAdmin(id: string) {
  return useSWR<AdminDetails>(queryKeys.admins.detail(id));
}

export function useCreateAdmin() {
  return useSWRMutation(
    queryKeys.admins.list(),
    async (key: unknown, { arg }: { arg: unknown }) => {
      return mutationFetcher(String(key), { method: `POST`, data: arg });
    },
    {
      onSuccess: () => {
        // Invalidate admin lists
      },
    },
  );
}

export function useUpdateAdmin(id: string) {
  return useSWRMutation(
    queryKeys.admins.detail(id),
    async (key: unknown, { arg }: { arg: unknown }) => {
      return mutationFetcher(String(key), { method: `PATCH`, data: arg });
    },
    {
      onSuccess: () => {
        // Invalidate related queries
      },
    },
  );
}

export function useResetAdminPassword(id: string) {
  return useSWRMutation(`/api/admins/${id}/password`, async (key: unknown, { arg }: { arg: unknown }) => {
    return mutationFetcher(String(key), { method: `PATCH`, data: arg });
  });
}

// Consumer hooks
export function useConsumers() {
  return useSWR<Consumer[]>(queryKeys.consumers.list());
}

export function useConsumer(id: string) {
  return useSWR<Consumer>(queryKeys.consumers.detail(id));
}

// Payment request hooks (list is paginated: { items, total, page, pageSize })
export function usePaymentRequests() {
  return useSWR<PaginatedResponse<PaymentRequest>>(queryKeys.paymentRequests.list());
}

export function usePaymentRequest(id: string) {
  return useSWR<PaymentRequest>(queryKeys.paymentRequests.detail(id));
}

// Ledger hooks (list is paginated: { items, total, page, pageSize })
export function useLedgerEntries() {
  return useSWR<PaginatedResponse<LedgerEntry>>(queryKeys.ledger.entries());
}

// Dashboard hooks
export function useDashboardStats() {
  return useSWR<DashboardStats>(queryKeys.dashboard.stats());
}

export function usePaymentRequestsByStatus() {
  return useSWR<PaymentRequestsByStatus>(queryKeys.dashboard.paymentRequestsByStatus());
}

export function useRecentPaymentRequests() {
  return useSWR<RecentPaymentRequest[]>(queryKeys.dashboard.recentPaymentRequests());
}

export function useLedgerAnomalies() {
  return useSWR<LedgerAnomaly[]>(queryKeys.dashboard.ledgerAnomalies());
}

export function useVerificationQueue() {
  return useSWR<VerificationQueueItem[]>(queryKeys.dashboard.verificationQueue());
}

export function useAuditAuth(filters?: {
  email?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  return useSWR<PaginatedResponse<AuthAuditItem>>(queryKeys.audit.auth(filters));
}

export function useAuditActions(filters?: {
  action?: string;
  adminId?: string;
  email?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  return useSWR<PaginatedResponse<ActionAuditItem>>(queryKeys.audit.actions(filters));
}

// Generic mutation hook for optimistic updates
export function useOptimisticMutation<TData>(
  key: string,
  updater: (currentData: TData | undefined) => TData,
  options?: {
    onError?: (error: Error, key: string, config: unknown) => void;
    onSuccess?: (data: unknown, key: string, config: unknown) => void;
  },
) {
  return useSWRMutation(
    key,
    async (keyArg: unknown, { arg }: { arg: unknown }) => {
      return mutationFetcher(String(keyArg), { method: `POST`, data: arg });
    },
    {
      optimisticData: updater,
      rollbackOnError: true,
      ...options,
    },
  );
}
