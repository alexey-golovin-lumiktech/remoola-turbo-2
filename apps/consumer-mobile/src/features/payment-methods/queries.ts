import { getEnv } from '../../lib/env.server';

export interface PaymentMethodItem {
  id?: string;
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  [key: string]: unknown;
}

export async function getPaymentMethods(cookie: string | null): Promise<PaymentMethodItem[]> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return [];
  const url = `${baseUrl}/consumer/payment-methods`;
  const res = await fetch(url, {
    method: `GET`,
    headers: { Cookie: cookie ?? `` },
    cache: `no-store`,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return [];
  const raw = await res.json();
  const items = Array.isArray(raw) ? raw : ((raw as { items?: unknown[] })?.items ?? []);
  return items as PaymentMethodItem[];
}
