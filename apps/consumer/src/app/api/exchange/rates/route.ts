import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies, buildForwardHeaders } from '../../../../lib/api-utils';

export async function GET(req: NextRequest) {
  const reqUrlSearch = new URL(req.url).search; // pass through query
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/exchange/rates${reqUrlSearch}`);

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
