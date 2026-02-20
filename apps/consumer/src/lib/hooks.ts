import { useEffect, useState } from 'react';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

import { ALLOWED_PREFERRED_CURRENCIES, type TPreferredCurrency } from '@remoola/api-types';

import { mutationFetcher } from './swr-config';

/** Preferred currency from consumer settings (display default only). Fetches once per mount. */
export function usePreferredCurrency(): { preferredCurrency: TPreferredCurrency | null; loaded: boolean } {
  const [preferredCurrency, setPreferredCurrency] = useState<TPreferredCurrency | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/settings`, { credentials: `include`, cache: `no-store` })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { preferredCurrency?: TPreferredCurrency | null } | null) => {
        if (!data?.preferredCurrency) {
          setPreferredCurrency(null);
        } else if (ALLOWED_PREFERRED_CURRENCIES.includes(data.preferredCurrency)) {
          setPreferredCurrency(data.preferredCurrency);
        } else {
          setPreferredCurrency(null);
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  return { preferredCurrency, loaded };
}

/** Pick first currency in list that is not the given one (for exchange "to" default). */
export function firstOtherCurrency(currencies: string[], from: string): string {
  const other = currencies.find((c) => c !== from);
  return other ?? currencies[0] ?? `USD`;
}

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
