import { NextResponse } from 'next/server';

import { appendSetCookies, fetchUpstream } from './api-utils';
import { getEnv } from './env.server';

type BaseUrlResult =
  | { ok: true; baseUrl: string }
  | { ok: false; response: NextResponse<{ code: string; message: string }> };

type ProxyTextRouteOptions = {
  url: string | URL;
  method?: RequestInit[`method`];
  init?: RequestInit;
  appendUpstreamSetCookies?: boolean;
  buildResponse?: (upstream: Response, body: string, responseHeaders: Headers) => Response | Promise<Response>;
};

type ProxyJsonRouteOptions<TPayload = unknown> = {
  url: string | URL;
  method?: RequestInit[`method`];
  init?: RequestInit;
  appendUpstreamSetCookies?: boolean;
  onUpstreamError?: (upstream: Response, payload: unknown, responseHeaders: Headers) => Response | Promise<Response>;
  onSuccess?: (upstream: Response, payload: TPayload, responseHeaders: Headers) => Response | Promise<Response>;
  onInvalidJson?: (upstream: Response, responseHeaders: Headers) => Response | Promise<Response>;
};

type ProxyBinaryRouteOptions = {
  url: string | URL;
  method?: RequestInit[`method`];
  init?: RequestInit;
  appendUpstreamSetCookies?: boolean;
  responseHeaderAllowlist?: Iterable<string>;
  buildResponse?: (upstream: Response, responseHeaders: Headers) => Response | Promise<Response>;
};

export function getConsumerApiBaseUrlResponse(): BaseUrlResult {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return {
      ok: false,
      response: NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 }),
    };
  }

  return { ok: true, baseUrl };
}

export function buildConsumerUpstreamUrl(
  baseUrl: string,
  path: string,
  query?: URLSearchParams | Iterable<[string, string]>,
): URL {
  const url = new URL(path, baseUrl);

  if (query instanceof URLSearchParams) {
    for (const [key, value] of query.entries()) {
      url.searchParams.append(key, value);
    }
  } else if (query) {
    for (const [key, value] of query) {
      url.searchParams.append(key, value);
    }
  }

  return url;
}

export async function proxyTextRoute({
  url,
  method,
  init,
  appendUpstreamSetCookies = false,
  buildResponse,
}: ProxyTextRouteOptions): Promise<Response> {
  const upstream = await fetchUpstream(url, { ...init, ...(method ? { method } : {}) });
  const body = await upstream.text();
  const responseHeaders = new Headers();

  if (appendUpstreamSetCookies) {
    appendSetCookies(responseHeaders, upstream.headers);
  }

  if (buildResponse) {
    return buildResponse(upstream, body, responseHeaders);
  }

  return new NextResponse(body, { status: upstream.status, headers: responseHeaders });
}

export async function proxyJsonRoute<TPayload = unknown>({
  url,
  method,
  init,
  appendUpstreamSetCookies = false,
  onUpstreamError,
  onSuccess,
  onInvalidJson,
}: ProxyJsonRouteOptions<TPayload>): Promise<Response> {
  const upstream = await fetchUpstream(url, { ...init, ...(method ? { method } : {}) });
  const responseHeaders = new Headers();

  if (appendUpstreamSetCookies) {
    appendSetCookies(responseHeaders, upstream.headers);
  }

  if (!upstream.ok) {
    const payload = (await upstream.json().catch(() => null)) as unknown;
    if (onUpstreamError) {
      return onUpstreamError(upstream, payload, responseHeaders);
    }
    return NextResponse.json(payload, { status: upstream.status, headers: responseHeaders });
  }

  let payload: TPayload;
  try {
    payload = (await upstream.json()) as TPayload;
  } catch {
    if (onInvalidJson) {
      return onInvalidJson(upstream, responseHeaders);
    }
    return NextResponse.json({ code: `INVALID_RESPONSE` }, { status: 502, headers: responseHeaders });
  }

  if (onSuccess) {
    return onSuccess(upstream, payload, responseHeaders);
  }

  return NextResponse.json(payload, { status: upstream.status, headers: responseHeaders });
}

export async function proxyBinaryRoute({
  url,
  method,
  init,
  appendUpstreamSetCookies = false,
  responseHeaderAllowlist,
  buildResponse,
}: ProxyBinaryRouteOptions): Promise<Response> {
  const upstream = await fetchUpstream(url, { ...init, ...(method ? { method } : {}) });
  const responseHeaders = new Headers();

  if (appendUpstreamSetCookies) {
    appendSetCookies(responseHeaders, upstream.headers);
  }

  if (responseHeaderAllowlist) {
    const allowlist = new Set(Array.from(responseHeaderAllowlist, (header) => header.toLowerCase()));
    for (const [name, value] of upstream.headers.entries()) {
      if (allowlist.has(name.toLowerCase())) {
        responseHeaders.set(name, value);
      }
    }
  }

  if (buildResponse) {
    return buildResponse(upstream, responseHeaders);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
