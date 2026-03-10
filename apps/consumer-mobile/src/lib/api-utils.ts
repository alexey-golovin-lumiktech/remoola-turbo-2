import { type NextRequest, NextResponse } from 'next/server';

import { type ApiErrorShape } from '@remoola/api-types';

import { clientLogger } from './logger';

/**
 * Returns all Set-Cookie header values from a Response.
 * Uses getSetCookie() (Node.js 18.14+) for correct multi-cookie support.
 * Falls back to get('set-cookie'), which in some undici versions returns only
 * the first value — using the array form ensures all three cookies
 * (__Host-access_token, __Host-refresh_token, csrf_token) are forwarded.
 */
export function getSetCookieValues(headers: Headers): string[] {
  const h = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof h.getSetCookie === `function`) {
    return h.getSetCookie();
  }
  const value = headers.get(`set-cookie`);
  return value ? [value] : [];
}

/**
 * Appends all Set-Cookie values from sourceHeaders into responseHeaders as
 * separate headers (required by RFC 6265 — do NOT combine into one value).
 */
export function appendSetCookies(responseHeaders: Headers, sourceHeaders: Headers): void {
  for (const cookie of getSetCookieValues(sourceHeaders)) {
    responseHeaders.append(`set-cookie`, cookie);
  }
}

export function handleApiError(error: unknown): NextResponse<ApiErrorShape> {
  clientLogger.error(`API Error`, {
    message: error instanceof Error ? error.message : String(error),
  });

  if (error instanceof Error) {
    if (error.message.includes(`fetch`)) {
      return NextResponse.json(
        { message: `Failed to connect to backend service`, code: `BACKEND_UNAVAILABLE` },
        { status: 503 },
      );
    }
    if (error.message.includes(`timeout`)) {
      return NextResponse.json({ message: `Request timed out`, code: `TIMEOUT` }, { status: 408 });
    }
    const err = error as { statusCode?: number; code?: string };
    if (err.statusCode != null) {
      return NextResponse.json(
        { message: error.message, code: err.code ?? `INTERNAL_ERROR` },
        { status: err.statusCode },
      );
    }
    return NextResponse.json({ message: error.message, code: `INTERNAL_ERROR` }, { status: 500 });
  }
  return NextResponse.json({ message: `An unexpected error occurred`, code: `UNKNOWN_ERROR` }, { status: 500 });
}

export async function proxyApiRequest(
  backendUrl: string,
  req: NextRequest,
  options: { timeout?: number; retries?: number } = {},
): Promise<NextResponse> {
  const { timeout = 30000, retries = 2 } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(backendUrl, {
        method: req.method,
        headers: new Headers(req.headers),
        credentials: `include`,
        ...(req.body && { duplex: `half` }),
        signal: controller.signal,
        ...(req.method !== `GET` && req.method !== `HEAD` && { body: req.body }),
      } as RequestInit);

      clearTimeout(timeoutId);
      const responseClone = response.clone();
      let body: string;
      try {
        body = await responseClone.text();
      } catch {
        body = ``;
      }
      const responseHeaders = new Headers();
      appendSetCookies(responseHeaders, response.headers);
      return new NextResponse(body, { status: response.status, headers: responseHeaders });
    } catch (error) {
      lastError = error;
      if (error instanceof Response && error.status >= 400 && error.status < 500) break;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }
  throw lastError;
}
