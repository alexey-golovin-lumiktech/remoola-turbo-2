import { getEnv } from '../../lib/env.server';
import { buildServerReadAuthHeaders } from '../../lib/server-action-auth';

export interface PaymentMethodItem {
  id: string;
  type: string;
  brand: string;
  last4: string;
  expMonth: string | null;
  expYear: string | null;
  defaultSelected: boolean;
  billingDetails: {
    id: string;
    email: string | null;
    name: string | null;
    phone: string | null;
  } | null;
}

export type GetPaymentMethodsResult = { ok: true; items: PaymentMethodItem[] } | { ok: false; status: number };

export async function getPaymentMethods(cookie: string | null): Promise<GetPaymentMethodsResult> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return { ok: false, status: 503 };
  const url = `${baseUrl}/consumer/payment-methods`;
  const res = await fetch(url, {
    method: `GET`,
    headers: buildServerReadAuthHeaders(cookie),
    cache: `no-store`,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return { ok: false, status: res.status };
  const raw = (await res.json()) as { items: PaymentMethodItem[] };
  return { ok: true, items: raw.items ?? [] };
}
