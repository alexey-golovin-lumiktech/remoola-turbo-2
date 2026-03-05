import { type SWRConfiguration } from 'swr';

export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
  errorRetryInterval: 5000,
  errorRetryCount: 3,
  shouldRetryOnError: (error: unknown) => {
    const err = error as { status?: number };
    return (err?.status ?? 0) >= 500;
  },
};

function queryKeyToUrl(key: unknown): string {
  if (typeof key === `string`) return key.startsWith(`/`) ? key : `/${key}`;
  if (Array.isArray(key)) {
    const [endpoint, params] = key as [string, Record<string, unknown>?];
    let url = endpoint.startsWith(`/`) ? endpoint : `/${endpoint}`;
    if (params && typeof params === `object`) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) searchParams.set(k, String(v));
      });
      const q = searchParams.toString();
      if (q) url += `?${q}`;
    }
    return url;
  }
  throw new Error(`Invalid query key: ${JSON.stringify(key)}`);
}

export async function swrFetcher<T>(key: unknown): Promise<T> {
  const url = queryKeyToUrl(key);
  const res = await fetch(url, { credentials: `include`, cache: `no-store` });
  if (!res.ok) {
    const text = await res.text();
    let message = `Request failed with ${res.status}`;
    try {
      const json = JSON.parse(text) as { message?: string };
      if (json.message) message = json.message;
    } catch {
      if (text) message = text.slice(0, 200);
    }
    const error = new Error(message) as Error & { status: number };
    error.status = res.status;
    throw error;
  }
  return res.json() as Promise<T>;
}
