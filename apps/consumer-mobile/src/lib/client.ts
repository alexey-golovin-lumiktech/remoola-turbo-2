import { type SWRConfiguration } from 'swr';

import { COOKIE_KEYS } from '@remoola/api-types';

import { handleSessionExpired } from './session-expired';

export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
  errorRetryInterval: 5000,
  errorRetryCount: 3,
  shouldRetryOnError: (error: unknown) => {
    const err = error as { status?: number };
    // Don't retry 401 (handled by fetcher), don't retry 4xx client errors
    // Only retry 5xx server errors
    const status = err?.status ?? 0;
    if (status === 401) return false; // Already handled in fetcher
    if (status >= 400 && status < 500) return false; // Client errors
    return status >= 500; // Retry server errors
  },
  onError: (error: unknown) => {
    const err = error as { status?: number; message?: string };
    if (err.status !== 401 && !err.message?.toLowerCase().includes(`session expired`)) return;
    handleSessionExpired();
  },
};

function getCsrfTokenFromCookie(): string | null {
  if (typeof document === `undefined`) return null;
  const key = `${COOKIE_KEYS.CSRF_TOKEN}=`;
  const parts = document.cookie.split(`;`);
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(key)) {
      return decodeURIComponent(trimmed.slice(key.length));
    }
  }
  return null;
}

function getCsrfHeader(): HeadersInit | undefined {
  const csrf = getCsrfTokenFromCookie();
  return csrf ? { 'x-csrf-token': csrf } : undefined;
}

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

/**
 * Fetch wrapper with automatic token refresh on 401 errors.
 * Use this for client-side API calls that need authentication.
 *
 * @example
 * const data = await fetchWithAuth('/api/profile', { method: 'GET' });
 */
export async function fetchWithAuth<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T; status: number } | { ok: false; error: string; status: number }> {
  let res = await fetch(url, {
    ...init,
    credentials: `include`,
    cache: `no-store`,
  });

  // If 401 Unauthorized, attempt token refresh and retry once
  if (res.status === 401) {
    try {
      const refreshRes = await fetch(`/api/consumer/auth/refresh`, {
        method: `POST`,
        credentials: `include`,
        cache: `no-store`,
        headers: getCsrfHeader(),
      });

      if (refreshRes.ok) {
        // Token refreshed successfully; retry with updated cookies and CSRF
        const retryHeaders = new Headers(init?.headers);
        const csrf = getCsrfHeader();
        if (csrf) Object.entries(csrf).forEach(([k, v]) => retryHeaders.set(k, v));
        res = await fetch(url, {
          ...init,
          credentials: `include`,
          cache: `no-store`,
          headers: retryHeaders,
        });
      } else {
        handleSessionExpired();
        return { ok: false, error: `Session expired`, status: 401 };
      }
    } catch {
      handleSessionExpired();
      return { ok: false, error: `Session expired`, status: 401 };
    }
  }

  if (!res.ok) {
    const text = await res.text();
    let message = `Request failed with ${res.status}`;
    try {
      const json = JSON.parse(text) as { message?: string };
      if (json.message) message = json.message;
    } catch {
      if (text) message = text.slice(0, 200);
    }
    return { ok: false, error: message, status: res.status };
  }

  try {
    const data = (await res.json()) as T;
    return { ok: true, data, status: res.status };
  } catch {
    return { ok: false, error: `Invalid response (not JSON)`, status: res.status };
  }
}

export async function swrFetcher<T>(key: unknown): Promise<T> {
  const url = queryKeyToUrl(key);
  let res = await fetch(url, { credentials: `include`, cache: `no-store` });

  // If 401 Unauthorized, attempt token refresh and retry once
  if (res.status === 401) {
    try {
      const refreshRes = await fetch(`/api/consumer/auth/refresh`, {
        method: `POST`,
        credentials: `include`,
        cache: `no-store`,
        headers: getCsrfHeader(),
      });

      if (refreshRes.ok) {
        // Token refreshed successfully; retry with updated cookies and CSRF
        res = await fetch(url, {
          credentials: `include`,
          cache: `no-store`,
          headers: getCsrfHeader(),
        });
      } else {
        handleSessionExpired();
        throw new Error(`Session expired`);
      }
    } catch {
      handleSessionExpired();
      throw new Error(`Session expired`);
    }
  }

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
