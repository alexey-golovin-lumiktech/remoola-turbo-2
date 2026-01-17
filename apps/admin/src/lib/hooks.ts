import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

import { mutationFetcher } from './swr-config';
import { queryKeys, type AdminUser, type AdminMe, type Consumer, type PaymentRequest, type LedgerEntry } from './types';

// Auth hooks
export function useAuth() {
  return useSWR<AdminMe>(queryKeys.auth.me(), {
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });
}

// Admin hooks
export function useAdmins(includeDeleted = false) {
  return useSWR<AdminUser[]>(queryKeys.admins.list({ includeDeleted }));
}

export function useAdmin(id: string) {
  return useSWR<AdminUser>(queryKeys.admins.detail(id));
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

// Payment request hooks
export function usePaymentRequests() {
  return useSWR<PaymentRequest[]>(queryKeys.paymentRequests.list());
}

export function usePaymentRequest(id: string) {
  return useSWR<PaymentRequest>(queryKeys.paymentRequests.detail(id));
}

// Ledger hooks
export function useLedgerEntries() {
  return useSWR<LedgerEntry[]>(queryKeys.ledger.entries());
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
