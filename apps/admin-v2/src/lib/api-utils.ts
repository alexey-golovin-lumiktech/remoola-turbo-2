import { NextResponse } from 'next/server';
import { type ZodType } from 'zod';

import { getEnv } from './env.server';
import { getRequestOrigin, getBypassHeaders } from './request-origin';

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

export const UPSTREAM_FETCH_TIMEOUT_MS = 15000;
export const UPSTREAM_NETWORK_ERROR_MESSAGE = `The upstream API request failed. Please try again.`;

export async function fetchUpstream(input: string | URL, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(input, {
      cache: `no-store`,
      ...init,
      signal: init.signal ?? AbortSignal.timeout(UPSTREAM_FETCH_TIMEOUT_MS),
    });
  } catch {
    return NextResponse.json({ code: `NETWORK_ERROR`, message: UPSTREAM_NETWORK_ERROR_MESSAGE }, { status: 503 });
  }
}

export function getSetCookieValues(headers: Headers): string[] {
  const h = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof h.getSetCookie === `function`) {
    return h.getSetCookie();
  }
  const value = headers.get(`set-cookie`);
  return value ? [value] : [];
}

export function appendSetCookies(responseHeaders: Headers, sourceHeaders: Headers): void {
  for (const cookie of getSetCookieValues(sourceHeaders)) {
    responseHeaders.append(`set-cookie`, cookie);
  }
}

function getForwardedOrigin(sourceHeaders: Headers): string {
  const requestOrigin = sourceHeaders.get(`origin`);
  if (requestOrigin) {
    try {
      return new URL(requestOrigin).origin;
    } catch {
      // Ignore malformed browser Origin headers and fall back to configured origin.
    }
  }
  return getRequestOrigin();
}

export function buildForwardHeaders(sourceHeaders: Headers): Headers {
  const headers = new Headers();
  for (const [name, value] of sourceHeaders.entries()) {
    const headerName = name.toLowerCase();
    if (FORWARDED_HEADER_ALLOWLIST.has(headerName) || headerName.startsWith(`x-remoola-`)) {
      headers.append(name, value);
    }
  }
  headers.delete(`origin`);
  headers.set(`origin`, getForwardedOrigin(sourceHeaders));
  for (const [key, value] of Object.entries(getBypassHeaders())) {
    headers.set(key, value);
  }
  return headers;
}

export function buildAuthMutationForwardHeaders(sourceHeaders: Headers): Headers {
  const headers = buildForwardHeaders(sourceHeaders);
  headers.delete(`host`);
  return headers;
}

export async function requireJsonBody(
  req: Request,
): Promise<{ ok: true; body: string } | { ok: false; response: NextResponse }> {
  const body = await req
    .clone()
    .text()
    .catch(() => null);

  if (body == null) {
    return {
      ok: false,
      response: NextResponse.json(
        { code: `INVALID_JSON`, message: `Request body must be valid JSON` },
        { status: 400 },
      ),
    };
  }

  try {
    JSON.parse(body);
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { code: `INVALID_JSON`, message: `Request body must be valid JSON` },
        { status: 400 },
      ),
    };
  }

  return { ok: true, body };
}

export async function requireValidatedJsonBody<T>(
  req: Request,
  schema: ZodType<T>,
  error: { code: string; message: string },
): Promise<{ ok: true; body: string; data: T } | { ok: false; response: NextResponse }> {
  const raw = await req
    .clone()
    .json()
    .catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          code: error.code,
          message: error.message,
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      ),
    };
  }

  return { ok: true, body: JSON.stringify(parsed.data), data: parsed.data };
}

type ProxyPreparedBody = { ok: true; body?: BodyInit | null } | { ok: false; response: NextResponse };

export async function proxyAdminApiRoute({
  req,
  method,
  upstreamPath,
  buildHeaders = buildForwardHeaders,
  prepareBody,
}: {
  req: Request;
  method: string;
  upstreamPath: string;
  buildHeaders?: (sourceHeaders: Headers) => Headers;
  prepareBody?: (req: Request) => Promise<ProxyPreparedBody> | ProxyPreparedBody;
}): Promise<NextResponse> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }

  const prepared = prepareBody ? await prepareBody(req) : { ok: true as const };
  if (!prepared.ok) {
    return prepared.response;
  }

  const headers = buildHeaders(new Headers(req.headers));
  headers.delete(`host`);

  const res = await fetchUpstream(new URL(`${baseUrl}${upstreamPath}`), {
    method,
    headers,
    body: prepared.body,
  });

  const data = await res.text();
  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, res.headers);
  return new NextResponse(data, { status: res.status, headers: responseHeaders });
}
