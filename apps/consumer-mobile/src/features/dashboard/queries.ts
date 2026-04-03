import { dashboardDataSchema, type DashboardData } from './schemas';
import { getEnv } from '../../lib/env.server';
import { buildServerReadAuthHeaders } from '../../lib/server-action-auth';

export async function getDashboardData(cookie: string | null): Promise<DashboardData | null> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return null;
  const url = `${baseUrl}/consumer/dashboard`;
  const res = await fetch(url, {
    method: `GET`,
    headers: buildServerReadAuthHeaders(cookie),
    cache: `no-store`,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;
  const raw = await res.json();
  const parsed = dashboardDataSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
