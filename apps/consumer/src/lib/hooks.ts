import { useEffect, useState } from 'react';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

import { isCurrencyCode, type TCurrencyCode } from '@remoola/api-types';

import { mutationFetcher } from './swr-config';
import { type IDashboardData } from '../types/dashboard';

/** Preferred currency from consumer settings (display default only). Fetches once per mount. */
export function usePreferredCurrency(): { preferredCurrency: TCurrencyCode | null; loaded: boolean } {
  const [preferredCurrency, setPreferredCurrency] = useState<TCurrencyCode | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/settings`, { credentials: `include`, cache: `no-store` })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { preferredCurrency?: TCurrencyCode | null } | null) => {
        if (!data?.preferredCurrency) {
          setPreferredCurrency(null);
        } else if (isCurrencyCode(data.preferredCurrency)) {
          setPreferredCurrency(data.preferredCurrency);
        } else {
          setPreferredCurrency(null);
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  return { preferredCurrency, loaded };
}

// Query keys for consistent caching
export const queryKeys = {
  dashboard: {
    main: () => [`api/dashboard`],
  },
  payments: {
    list: (params?: Record<string, string | undefined>) => [`api/payments`, params],
    detail: (id: string) => [`api/payments/${id}`],
    balance: () => [`api/payments/balance`],
    history: () => [`api/payments/history`],
    pendingWithdrawals: () => [
      `api/payments/history`,
      {
        direction: `OUTCOME`,
        status: `PENDING`,
        limit: `5`,
      },
    ],
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
  return useSWR<IDashboardData>(queryKeys.dashboard.main());
}

// Payments hooks
export function usePayments(params?: Record<string, string | undefined>) {
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
    async (key: unknown, { arg }: { arg: unknown }) => {
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
  return useSWRMutation(queryKeys.payments.detail(id), async (key: unknown, { arg }: { arg: unknown }) => {
    return mutationFetcher(key, { method: `PATCH`, data: arg });
  });
}

export function useStartPayment() {
  return useSWRMutation(`payments/start`, async (key: unknown, { arg }: { arg: unknown }) => {
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
  return useSWRMutation(queryKeys.contacts.list(), async (key: unknown, { arg }: { arg: unknown }) => {
    return mutationFetcher(key, { method: `POST`, data: arg });
  });
}

export function useUpdateContact(id: string) {
  return useSWRMutation(queryKeys.contacts.detail(id), async (key: unknown, { arg }: { arg: unknown }) => {
    return mutationFetcher(key, { method: `PATCH`, data: arg });
  });
}

export function useDeleteContact(id: string) {
  return useSWRMutation(
    queryKeys.contacts.detail(id),
    async (/* eslint-disable-line @typescript-eslint/no-unused-vars */ key: unknown, _arg: { arg: unknown }) => {
      return mutationFetcher(key, { method: `DELETE` });
    },
    {
      optimisticData: (/* eslint-disable-line @typescript-eslint/no-unused-vars */ _currentData: unknown) => {
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
  return useSWRMutation(`exchange/convert`, async (key: unknown, { arg }: { arg: unknown }) => {
    return mutationFetcher(key, { method: `POST`, data: arg });
  });
}

// Generic optimistic mutation hook
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
    async (_key: unknown, { arg }: { arg: unknown }) => {
      return mutationFetcher(key, { method: `POST`, data: arg });
    },
    {
      optimisticData: (_currentData: TData | undefined) => updater(_currentData),
      rollbackOnError: true,
      ...options,
    },
  );
}
