import { getEnv } from '../../lib/env.server';

export interface DocumentItem {
  id?: string;
  name?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export async function getDocumentsList(cookie: string | null): Promise<DocumentItem[]> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return [];
  const url = `${baseUrl}/consumer/documents`;
  const res = await fetch(url, {
    method: `GET`,
    headers: { Cookie: cookie ?? `` },
    cache: `no-store`,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return [];
  const raw = await res.json();
  const items = Array.isArray(raw) ? raw : ((raw as { items?: unknown[] })?.items ?? []);
  return items as DocumentItem[];
}
