import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies, buildForwardHeaders } from '../../../lib/api-utils';
import { getEnv } from '../../../lib/env.server';

export async function GET(req: NextRequest) {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }

  const forwardHeaders = buildForwardHeaders(req.headers);
  forwardHeaders.delete(`host`);

  const url = new URL(`${baseUrl}/consumer/auth/me`);
  const res = await fetch(url, {
    method: `GET`,
    headers: forwardHeaders,
    cache: `no-store`,
  });

  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, res.headers);

  if (!res.ok) {
    return NextResponse.json(
      { code: `UPSTREAM_ERROR`, status: res.status },
      { status: res.status, headers: responseHeaders },
    );
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return NextResponse.json({ code: `INVALID_RESPONSE` }, { status: 502, headers: responseHeaders });
  }
  return NextResponse.json(data, { status: res.status, headers: responseHeaders });
}
