import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies, buildForwardHeaders } from '../../../../lib/api-utils';
import { getEnv } from '../../../../lib/env.server';

export async function GET(req: NextRequest) {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }
  const reqUrlSearch = new URL(req.url).search;
  const url = new URL(`${baseUrl}/consumer/exchange/rates${reqUrlSearch}`);
  const res = await fetch(url, {
    method: `GET`,
    headers: buildForwardHeaders(req.headers),
    credentials: `include`,
    cache: `no-store`,
  });
  const data = await res.text();
  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, res.headers);
  return new NextResponse(data, { status: res.status, headers: responseHeaders });
}
