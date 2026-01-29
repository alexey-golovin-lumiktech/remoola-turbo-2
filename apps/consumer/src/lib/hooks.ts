import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

import { mutationFetcher } from './swr-config';

// Query keys for consistent caching
export const queryKeys = {
  dashboard: {
    main: () => [`api/dashboard`],
  },
  payments: {
    list: (params?: Record<string, any>) => [`api/payments`, params],
    detail: (id: string) => [`api/payments/${id}`],
    balance: () => [`api/payments/balance`],
    history: () => [`api/payments/history`],
  },
  contacts: {
    list: () => [`api/contacts`],
    detail: (id: string) => [`api/contacts/${id}`],
  },
  exchange: {
    rates: (params?: { from: string; to: string }) => [`api/exchange/rates`, params],
  },
};

// Dashboard hooks
export function useDashboard() {
  return useSWR(queryKeys.dashboard.main());
}

// Payments hooks
export function usePayments(params?: Record<string, any>) {
  return useSWR(queryKeys.payments.list(params));
}

export function usePayment(id: string) {
  return useSWR(queryKeys.payments.detail(id));
}

export function usePaymentBalance() {
  return useSWR(queryKeys.payments.balance());
}

export function usePaymentHistory() {
  return useSWR(queryKeys.payments.history());
}

// Payment mutations
export function useCreatePayment() {
  return useSWRMutation(
    queryKeys.payments.list(),
    async (key: any, { arg }: { arg: any }) => {
      return mutationFetcher(key, { method: `POST`, data: arg });
    },
    {
      onSuccess: () => {
        // Payments list will be invalidated automatically by SWR
      },
    },
  );
}

export function useUpdatePayment(id: string) {
  return useSWRMutation(queryKeys.payments.detail(id), async (key: any, { arg }: { arg: any }) => {
    return mutationFetcher(key, { method: `PATCH`, data: arg });
  });
}

export function useStartPayment() {
  return useSWRMutation(`payments/start`, async (key: any, { arg }: { arg: any }) => {
    return mutationFetcher(key, { method: `POST`, data: arg });
  });
}

// Contacts hooks
export function useContacts() {
  return useSWR(queryKeys.contacts.list());
}

export function useContact(id: string) {
  return useSWR(queryKeys.contacts.detail(id));
}

// Contact mutations
export function useCreateContact() {
  return useSWRMutation(queryKeys.contacts.list(), async (key: any, { arg }: { arg: any }) => {
    return mutationFetcher(key, { method: `POST`, data: arg });
  });
}

export function useUpdateContact(id: string) {
  return useSWRMutation(queryKeys.contacts.detail(id), async (key: any, { arg }: { arg: any }) => {
    return mutationFetcher(key, { method: `PATCH`, data: arg });
  });
}

export function useDeleteContact(id: string) {
  return useSWRMutation(
    queryKeys.contacts.detail(id),
    async (/* eslint-disable-line @typescript-eslint/no-unused-vars */ key: any, _arg: { arg: any }) => {
      return mutationFetcher(key, { method: `DELETE` });
    },
    {
      optimisticData: (/* eslint-disable-line @typescript-eslint/no-unused-vars */ _currentData: any) => {
        // Optimistically remove the contact from the list
        return null;
      },
    },
  );
}

// Exchange hooks
export function useExchangeRates(params?: { from: string; to: string }) {
  return useSWR(queryKeys.exchange.rates(params));
}

export function useConvertCurrency() {
  return useSWRMutation(`exchange/convert`, async (key: any, { arg }: { arg: any }) => {
    return mutationFetcher(key, { method: `POST`, data: arg });
  });
}

// Generic optimistic mutation hook
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
    async (_key: any, { arg }: { arg: any }) => {
      return mutationFetcher(key, { method: `POST`, data: arg });
    },
    {
      optimisticData: (_currentData: TData | undefined) => updater(_currentData),
      rollbackOnError: true,
      ...options,
    },
  );
}
