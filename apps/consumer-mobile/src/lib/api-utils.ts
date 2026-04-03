import { type NextRequest, NextResponse } from 'next/server';

import { getConsumerMobileCsrfTokenCookieKeysForRead, type ApiErrorShape } from '@remoola/api-types';

import { clientLogger } from './logger';
import { getBypassHeaders, getRequestOrigin } from './request-origin';

const DEFAULT_MAX_JSON_BODY_BYTES = 1024 * 1024; // 1 MB
const FORWARDED_HEADER_ALLOWLIST = new Set([
  `accept`,
  `accept-language`,
  `content-type`,
  `cookie`,
  `idempotency-key`,
  `origin`,
  `user-agent`,
  `x-correlation-id`,
  `x-csrf-token`,
  `x-request-id`,
]);

function getCsrfTokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const key of getConsumerMobileCsrfTokenCookieKeysForRead()) {
    const match = cookieHeader
      .split(`;`)
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${key}=`));
    if (match) {
      return match.split(`=`).slice(1).join(`=`);
    }
  }
  return null;
}

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

export function buildForwardHeaders(sourceHeaders: Headers): Headers {
  const headers = new Headers();
  for (const [name, value] of sourceHeaders.entries()) {
    const headerName = name.toLowerCase();
    if (FORWARDED_HEADER_ALLOWLIST.has(headerName) || headerName.startsWith(`x-remoola-`)) {
      headers.append(name, value);
    }
  }
  if (!headers.has(`x-csrf-token`)) {
    const csrfToken = getCsrfTokenFromCookieHeader(headers.get(`cookie`));
    if (csrfToken) {
      headers.set(`x-csrf-token`, csrfToken);
    }
  }
  if (!headers.has(`origin`)) {
    headers.set(`origin`, getRequestOrigin());
  }
  for (const [k, v] of Object.entries(getBypassHeaders())) headers.set(k, v);
  return headers;
}

export function buildAuthMutationForwardHeaders(sourceHeaders: Headers): Headers {
  const headers = buildForwardHeaders(sourceHeaders);
  headers.delete(`host`);
  return headers;
}

/**
 * Validates that a mutation request carries a JSON body.
 * Backward compatibility: empty mutation bodies are allowed and forwarded as empty strings.
 * For non-empty bodies, Content-Type must be application/json and body must be valid JSON.
 * Returns the raw body string on success so callers can forward it without reading the stream twice.
 */
export async function requireJsonBody(
  req: NextRequest,
  options: { allowEmpty?: boolean; maxBytes?: number } = {},
): Promise<{ ok: true; body: string } | { ok: false; response: NextResponse }> {
  const { allowEmpty = false, maxBytes = DEFAULT_MAX_JSON_BODY_BYTES } = options;
  const contentType = req.headers.get(`content-type`) ?? ``;
  const contentLengthHeader = req.headers.get(`content-length`);
  const parsedContentLength = contentLengthHeader ? Number(contentLengthHeader) : NaN;
  if (Number.isFinite(parsedContentLength) && parsedContentLength > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json({ message: `Request body too large`, code: `PAYLOAD_TOO_LARGE` }, { status: 413 }),
    };
  }
  let body: string;
  try {
    body = await req.text();
    if (Buffer.byteLength(body, `utf8`) > maxBytes) {
      return {
        ok: false,
        response: NextResponse.json({ message: `Request body too large`, code: `PAYLOAD_TOO_LARGE` }, { status: 413 }),
      };
    }
    if (body.trim().length === 0) {
      if (allowEmpty || contentLengthHeader == null || parsedContentLength === 0) return { ok: true, body };
      throw new Error(`Empty JSON body`);
    }
    if (!contentType.includes(`application/json`)) {
      return {
        ok: false,
        response: NextResponse.json(
          { message: `Content-Type must be application/json`, code: `INVALID_CONTENT_TYPE` },
          { status: 400 },
        ),
      };
    }
    JSON.parse(body);
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ message: `Invalid JSON body`, code: `INVALID_JSON` }, { status: 400 }),
    };
  }
  return { ok: true, body };
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
        headers: buildForwardHeaders(req.headers),
        credentials: `include`,
        cache: `no-store`,
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
