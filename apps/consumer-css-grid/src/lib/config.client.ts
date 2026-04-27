export const CLIENT_CONFIG = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || ``,
} as const;

export function getApiBaseUrl(): string {
  const url = CLIENT_CONFIG.API_BASE_URL;
  if (!url) {
    throw new Error(`NEXT_PUBLIC_API_BASE_URL is not configured`);
  }
  return url;
}

export function getApiBaseUrlOptional(): string | null {
  return CLIENT_CONFIG.API_BASE_URL || null;
}
