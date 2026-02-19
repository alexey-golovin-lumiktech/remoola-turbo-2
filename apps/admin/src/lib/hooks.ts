import { useEffect, useState } from 'react';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

import { mutationFetcher } from './swr-config';
import {
  queryKeys,
  type AdminDetails,
  type AdminMe,
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

// Admin hooks
export function useAdmins(includeDeleted = false) {
  return useSWR<AdminDetails[]>(queryKeys.admins.list({ includeDeleted }));
}

export function useAdmin(id: string) {
  return useSWR<AdminDetails>(queryKeys.admins.detail(id));
}

export function useCreateAdmin() {
  return useSWRMutation(
    queryKeys.admins.list(),
    async (key: any, { arg }: { arg: any }) => {
      return mutationFetcher(key, { method: `POST`, data: arg });
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
    async (key: any, { arg }: { arg: any }) => {
      return mutationFetcher(key, { method: `PATCH`, data: arg });
    },
    {
      onSuccess: () => {
        // Invalidate related queries
      },
    },
  );
}

export function useResetAdminPassword(id: string) {
  return useSWRMutation(`admins/${id}/password`, async (key: any, { arg }: { arg: any }) => {
    return mutationFetcher(key, { method: `PATCH`, data: arg });
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

// Generic mutation hook for optimistic updates
export function useOptimisticMutation<TData>(
  key: string,
  updater: (currentData: TData | undefined) => TData,
  options?: {
    onError?: (error: Error, key: string, config: any) => void;
    onSuccess?: (data: any, key: string, config: any) => void;
  },
) {
  return useSWRMutation(
    key,
    async (key: any, { arg }: { arg: any }) => {
      return mutationFetcher(key, { method: `POST`, data: arg });
    },
    {
      optimisticData: updater,
      rollbackOnError: true,
      ...options,
    },
  );
}
