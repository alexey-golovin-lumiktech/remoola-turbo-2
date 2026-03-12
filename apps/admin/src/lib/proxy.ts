import { type NextRequest, NextResponse } from 'next/server';

const DEFAULT_MAX_JSON_BODY_BYTES = 1024 * 1024; // 1 MB
const FORWARDED_HEADER_ALLOWLIST = new Set([
  `accept`,
  `accept-language`,
  `authorization`,
  `content-type`,
  `cookie`,
  `idempotency-key`,
  `origin`,
  `user-agent`,
  `x-correlation-id`,
  `x-csrf-token`,
  `x-request-id`,
]);

/**
 * Returns all Set-Cookie header values from a Response.
 * Uses getSetCookie() (Node 18.14+) for correct multi-cookie support.
 */
function getSetCookieValues(headers: Headers): string[] {
  const h = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof h.getSetCookie === `function`) {
    return h.getSetCookie();
  }
  const value = headers.get(`set-cookie`);
  return value ? [value] : [];
}

/** Appends all Set-Cookie values from source into target (RFC 6265: one value per header). */
function appendSetCookies(target: Headers, source: Headers): void {
  for (const cookie of getSetCookieValues(source)) {
    target.append(`set-cookie`, cookie);
  }
}

function buildForwardHeaders(sourceHeaders: Headers): Headers {
  const headers = new Headers();
  for (const [name, value] of sourceHeaders.entries()) {
    const headerName = name.toLowerCase();
    if (FORWARDED_HEADER_ALLOWLIST.has(headerName) || headerName.startsWith(`x-remoola-`)) {
      headers.append(name, value);
    }
  }
  return headers;
}

export async function proxyToBackend(req: NextRequest, backendPath: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const search = req.nextUrl?.search ?? ``;
  const url = base + backendPath + search;

  const headers = buildForwardHeaders(req.headers);

  const isMutation = req.method !== `GET` && req.method !== `HEAD`;

  let body: string | undefined;
  if (isMutation) {
    const contentLengthHeader = req.headers.get(`content-length`);
    const parsedContentLength = contentLengthHeader ? Number(contentLengthHeader) : NaN;
    if (Number.isFinite(parsedContentLength) && parsedContentLength > DEFAULT_MAX_JSON_BODY_BYTES) {
      return NextResponse.json({ message: `Request body too large`, code: `PAYLOAD_TOO_LARGE` }, { status: 413 });
    }
    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, `utf8`) > DEFAULT_MAX_JSON_BODY_BYTES) {
      return NextResponse.json({ message: `Request body too large`, code: `PAYLOAD_TOO_LARGE` }, { status: 413 });
    }
    if (rawBody.length > 0) {
      const contentType = req.headers.get(`content-type`) ?? ``;
      if (!contentType.includes(`application/json`)) {
        return NextResponse.json(
          { message: `Content-Type must be application/json`, code: `INVALID_CONTENT_TYPE` },
          { status: 400 },
        );
      }
      try {
        JSON.parse(rawBody);
      } catch {
        return NextResponse.json({ message: `Invalid JSON body`, code: `INVALID_JSON` }, { status: 400 });
      }
      body = rawBody;
    }
  }

  const response = await fetch(url, {
    method: req.method,
    headers,
    body,
    credentials: `include`,
    redirect: `manual`,
    cache: `no-store`,
  });

  const text = await response.text();

  const outHeaders = new Headers();
  appendSetCookies(outHeaders, response.headers);
  const contentType = response.headers.get(`content-type`);
  if (contentType) outHeaders.set(`content-type`, contentType);

  return new NextResponse(text, { status: response.status, headers: outHeaders });
}
