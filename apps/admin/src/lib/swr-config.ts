import { type SWRConfiguration } from 'swr';

import { apiClient, type ApiResponse, type ApiError } from './api';

// Enhanced SWR configuration
export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000, // 5 seconds
  errorRetryInterval: 5000,
  errorRetryCount: 3,
  focusThrottleInterval: 5000,
  shouldRetryOnError: (error) => {
    // Don't retry on 4xx errors (client errors)
    return error?.status >= 500;
  },
};

// Convert SWR query key to URL
function queryKeyToUrl(key: any): string {
  if (typeof key === `string`) {
    return key;
  }

  if (Array.isArray(key)) {
    const [endpoint, params] = key;

    let url = `/${endpoint}`;

    // Handle query parameters
    if (params && typeof params === `object`) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          searchParams.set(k, String(v));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return url;
  }

  throw new Error(`Invalid query key: ${JSON.stringify(key)}`);
}

// Enhanced fetcher that works with our ApiClient
export const swrFetcher = async <T>(key: any): Promise<T> => {
  const url = queryKeyToUrl(key);
  const response = await apiClient.get<T>(url, { skipCache: true }); // Let SWR handle caching

  if (!response.ok) {
    const errorResult = response as { ok: false; status: number; error: ApiError };
    const error = new Error(errorResult.error.message) as any;
    error.status = errorResult.status;
    error.code = errorResult.error.code;
    throw error;
  }

  return response.data;
};

// Mutation fetcher for POST/PATCH/DELETE
export const mutationFetcher = async <T>(url: string, options: { method: string; data?: any }): Promise<T> => {
  let response: ApiResponse<T>;

  switch (options.method.toUpperCase()) {
    case `POST`:
      response = await apiClient.post<T>(url, options.data);
      break;
    case `PATCH`:
      response = await apiClient.patch<T>(url, options.data);
      break;
    case `DELETE`:
      response = await apiClient.delete<T>(url);
      break;
    default:
      throw new Error(`Unsupported method: ${options.method}`);
  }

  if (!response.ok) {
    const errorResult = response as { ok: false; status: number; error: ApiError };
    const error = new Error(errorResult.error.message) as any;
    error.status = errorResult.status;
    error.code = errorResult.error.code;
    throw error;
  }

  return response.data;
};
