import { normalizeCurrencies, type Currency } from '../../lib/currency-utils';
import { getEnv } from '../../lib/env.server';
import { getServerActionQueryAuthHeaders } from '../../lib/server-action-read-auth';

interface Balance {
  currency: string;
  amountCents: number;
  symbol: string;
}

interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: string;
  trend?: `up` | `down` | `stable`;
}

interface ExchangeRule {
  id: string;
  name: string;
  fromCurrency: string;
  toCurrency: string;
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface ScheduledConversion {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  scheduledAt: string;
  status: string;
  createdAt: string;
}

export async function fetchCurrencies(): Promise<Currency[]> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    return [];
  }

  try {
    const res = await fetch(`${baseUrl}/consumer/exchange/currencies`, {
      headers: await getServerActionQueryAuthHeaders(),
      cache: `no-store`,
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return normalizeCurrencies(Array.isArray(data) ? data : (data?.items ?? []));
  } catch {
    return [];
  }
}

export async function fetchBalances(): Promise<Balance[]> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    return [];
  }

  try {
    const res = await fetch(`${baseUrl}/consumer/payments/balance`, {
      headers: await getServerActionQueryAuthHeaders(),
      cache: `no-store`,
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : (data?.items ?? []);
  } catch {
    return [];
  }
}

export async function fetchExchangeRates(): Promise<ExchangeRate[]> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    return [];
  }

  try {
    const res = await fetch(`${baseUrl}/consumer/exchange/rates`, {
      headers: await getServerActionQueryAuthHeaders(),
      cache: `no-store`,
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : (data?.items ?? []);
  } catch {
    return [];
  }
}

export async function fetchExchangeRules(): Promise<ExchangeRule[]> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    return [];
  }

  try {
    const res = await fetch(`${baseUrl}/consumer/exchange/rules`, {
      headers: await getServerActionQueryAuthHeaders(),
      cache: `no-store`,
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : (data?.items ?? []);
  } catch {
    return [];
  }
}

export async function fetchScheduledConversions(): Promise<ScheduledConversion[]> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    return [];
  }

  try {
    const res = await fetch(`${baseUrl}/consumer/exchange/scheduled`, {
      headers: await getServerActionQueryAuthHeaders(),
      cache: `no-store`,
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : (data?.items ?? []);
  } catch {
    return [];
  }
}
