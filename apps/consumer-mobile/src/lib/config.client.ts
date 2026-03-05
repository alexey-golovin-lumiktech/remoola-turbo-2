/**
 * Client-safe configuration.
 * Only NEXT_PUBLIC_* env vars should be accessed here.
 * This file can be imported in both client and server components.
 */

export const CLIENT_CONFIG = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || ``,
} as const;

/**
 * Get the API base URL, throwing an error if not configured.
 * Use this when the API URL is required for the operation.
 */
export function getApiBaseUrl(): string {
  const url = CLIENT_CONFIG.API_BASE_URL;
  if (!url) {
    throw new Error(`NEXT_PUBLIC_API_BASE_URL is not configured`);
  }
  return url;
}

/**
 * Get the API base URL, returning null if not configured.
 * Use this when the API URL is optional.
 */
export function getApiBaseUrlOptional(): string | null {
  return CLIENT_CONFIG.API_BASE_URL || null;
}
