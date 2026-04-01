import { NextResponse } from 'next/server';

import { getBypassHeaders } from './request-origin';

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

export function buildForwardHeaders(sourceHeaders: Headers): Headers {
  const headers = new Headers();
  for (const [name, value] of sourceHeaders.entries()) {
    const headerName = name.toLowerCase();
    if (FORWARDED_HEADER_ALLOWLIST.has(headerName) || headerName.startsWith(`x-remoola-`)) {
      headers.append(name, value);
    }
  }
  for (const [k, v] of Object.entries(getBypassHeaders())) headers.set(k, v);
  return headers;
}

export function buildAuthMutationForwardHeaders(sourceHeaders: Headers): Headers {
  const headers = buildForwardHeaders(sourceHeaders);
  headers.delete(`authorization`);
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
