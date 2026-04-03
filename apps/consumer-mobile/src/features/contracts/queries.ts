import { contractsResponseSchema, type ContractsResponse } from './schemas';
import { getEnv } from '../../lib/env.server';
import { buildServerReadAuthHeaders } from '../../lib/server-action-auth';

interface GetContractsListParams {
  cookie: string | null;
  page?: number;
  pageSize?: number;
}

export async function getContractsList({
  cookie,
  page = 1,
  pageSize = 10,
}: GetContractsListParams): Promise<ContractsResponse> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return { items: [], total: 0 };

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  const res = await fetch(`${baseUrl}/consumer/contracts?${params}`, {
    method: `GET`,
    headers: buildServerReadAuthHeaders(cookie),
    cache: `no-store`,
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return { items: [], total: 0 };

  const raw = await res.json();
  const parsed = contractsResponseSchema.safeParse(raw);

  return parsed.success ? parsed.data : { items: [], total: 0 };
}
