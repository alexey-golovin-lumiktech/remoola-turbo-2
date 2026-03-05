import { balanceSchema, paymentsResponseSchema, type Balance, type PaymentsResponse } from './schemas';
import { getEnv } from '../../lib/env.server';
import { serverLogger } from '../../lib/logger.server';

export async function getBalance(cookie: string | null): Promise<Balance | null> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  serverLogger.debug(`getBalance called`, { baseUrl: !!baseUrl });
  if (!baseUrl) return null;

  try {
    const url = `${baseUrl}/consumer/payments/balance`;
    serverLogger.debug(`Fetching balance`, { url });
    const res = await fetch(url, {
      method: `GET`,
      headers: { Cookie: cookie ?? `` },
      cache: `no-store`,
      signal: AbortSignal.timeout(10000),
    });
    serverLogger.debug(`Balance response received`, { status: res.status });

    if (!res.ok) {
      const text = await res.text();
      serverLogger.warn(`Balance response not ok`, { status: res.status, responseLength: text.length });
      return null;
    }
    const raw = await res.json();
    serverLogger.debug(`Balance raw response received`, { hasData: !!raw });
    const parsed = balanceSchema.safeParse(raw);
    serverLogger.debug(`Balance parse result`, { success: parsed.success });
    if (!parsed.success) {
      serverLogger.error(`Balance parse error`, { error: parsed.error.message });
    }
    return parsed.success ? parsed.data : null;
  } catch (error) {
    serverLogger.error(`Balance fetch error`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export interface GetPaymentsParams {
  cookie: string | null;
  page?: number;
  pageSize?: number;
  status?: string;
  type?: string;
  search?: string;
}

export async function getPayments({
  cookie,
  page = 1,
  pageSize = 20,
  status,
  type,
  search,
}: GetPaymentsParams): Promise<PaymentsResponse> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    serverLogger.error(`getPayments failed: No baseUrl configured`);
    return { items: [], total: 0 };
  }

  try {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    if (status) params.set(`status`, status);
    if (type) params.set(`type`, type);
    if (search) params.set(`search`, search);

    const url = `${baseUrl}/consumer/payments?${params}`;
    serverLogger.debug(`Fetching payments`, { page, pageSize, status, type, search });

    const res = await fetch(url, {
      method: `GET`,
      headers: { Cookie: cookie ?? `` },
      cache: `no-store`,
      signal: AbortSignal.timeout(15000),
    });

    serverLogger.debug(`Payments response received`, { status: res.status });

    if (!res.ok) {
      const text = await res.text();
      serverLogger.warn(`Payments response not ok`, {
        status: res.status,
        statusText: res.statusText,
        responseLength: text.length,
      });
      return { items: [], total: 0 };
    }

    const raw = await res.json();
    serverLogger.debug(`Payments raw response received`, { hasData: !!raw });

    const parsed = paymentsResponseSchema.safeParse(raw);
    serverLogger.debug(`Payments parse result`, { success: parsed.success });

    if (!parsed.success) {
      serverLogger.error(`Payments parse error`, { error: parsed.error.message });
    }

    return parsed.success ? parsed.data : { items: [], total: 0 };
  } catch (error) {
    serverLogger.error(`Payments fetch error`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return { items: [], total: 0 };
  }
}

export async function getPaymentDetail(paymentRequestId: string, cookie: string | null): Promise<unknown> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return null;
  const res = await fetch(`${baseUrl}/consumer/payments/${paymentRequestId}`, {
    method: `GET`,
    headers: { Cookie: cookie ?? `` },
    cache: `no-store`,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  return res.json();
}
