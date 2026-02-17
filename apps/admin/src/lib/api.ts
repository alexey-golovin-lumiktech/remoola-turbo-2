import { z } from 'zod';

import { type ApiErrorShape, type ApiResponseShape } from '@remoola/api-types';

// Enhanced error types
export const ApiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  details: z.any().optional(),
});

// Enhanced API client with caching and deduplication
export class ApiClient {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private pendingRequests = new Map<string, Promise<any>>();
  private baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || ``;

  constructor(baseURL?: string) {
    if (baseURL) this.baseURL = baseURL;
  }

  async fetch<T>(
    path: string,
    options: RequestInit = {},
    cacheConfig: { ttl?: number; skipCache?: boolean } = {},
  ): Promise<ApiResponseShape<T>> {
    const { ttl = 5 * 60 * 1000, skipCache = false } = cacheConfig; // 5 minutes default
    const fullUrl = path;
    const cacheKey = `${fullUrl}:${JSON.stringify(options)}`;

    // Check cache first (unless explicitly skipped)
    if ((!skipCache && !options.method) || options.method === `GET`) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return { ok: true, data: cached.data };
      }
    }

    // Deduplicate concurrent requests
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    const request = this.makeRequest<T>(fullUrl, options, cacheKey, ttl);
    this.pendingRequests.set(cacheKey, request);

    try {
      const result = await request;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async makeRequest<T>(
    url: string,
    options: RequestInit,
    cacheKey: string,
    ttl: number,
  ): Promise<ApiResponseShape<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        credentials: `include`,
        headers: {
          'Content-Type': `application/json`,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        const error = this.parseError(errorText);

        return {
          ok: false,
          status: response.status,
          error,
        };
      }

      // Handle streaming for large responses
      const contentLength = response.headers.get(`content-length`);
      if (contentLength && parseInt(contentLength) > 1024 * 1024) {
        // > 1MB
        // For now, still read as text but log warning
        console.warn(`Large response detected, consider implementing streaming`);
      }

      const data = await response.json();

      // Cache successful GET responses
      if (!options.method || options.method === `GET`) {
        this.cache.set(cacheKey, { data, timestamp: Date.now(), ttl });
      }

      return { ok: true, data };
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === `AbortError`) {
        return {
          ok: false,
          status: 408,
          error: { message: `Request timeout`, code: `TIMEOUT` },
        };
      }

      return {
        ok: false,
        status: 0,
        error: { message: `Network error`, code: `NETWORK_ERROR` },
      };
    }
  }

  private parseError(text: string): ApiErrorShape {
    try {
      const parsed = JSON.parse(text);
      return ApiErrorSchema.parse(parsed);
    } catch {
      return { message: text };
    }
  }

  // Utility methods
  get<T>(path: string, cacheConfig?: { ttl?: number; skipCache?: boolean }) {
    return this.fetch<T>(path, { method: `GET` }, cacheConfig);
  }

  post<T>(path: string, data?: any) {
    return this.fetch<T>(
      path,
      {
        method: `POST`,
        body: data ? JSON.stringify(data) : undefined,
      },
      { skipCache: true },
    );
  }

  patch<T>(path: string, data?: any) {
    return this.fetch<T>(
      path,
      {
        method: `PATCH`,
        body: data ? JSON.stringify(data) : undefined,
      },
      { skipCache: true },
    );
  }

  delete<T>(path: string) {
    return this.fetch<T>(path, { method: `DELETE` }, { skipCache: true });
  }

  // Cache management
  clearCache() {
    this.cache.clear();
  }

  invalidateCache(pattern: string) {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.cache.delete(key));
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Backward compatibility wrapper
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string; raw?: any }> {
  const result = await apiClient.fetch<T>(path, init, { skipCache: true });

  if (result.ok) {
    return { ok: true, data: result.data };
  }

  // Type assertion for error case
  const errorResult = result as { ok: false; status: number; error: ApiErrorShape };
  return {
    ok: false,
    status: errorResult.status,
    message: errorResult.error.message,
    raw: errorResult.error,
  };
}
