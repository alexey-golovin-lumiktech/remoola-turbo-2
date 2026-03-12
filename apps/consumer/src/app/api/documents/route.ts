import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies, buildForwardHeaders } from '../../../lib/api-utils';

export async function GET(req: NextRequest) {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/documents`);

  const params = Object.fromEntries(new URL(req.url).searchParams);
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      if (url.searchParams.has(key)) url.searchParams.set(key, value);
      else url.searchParams.append(key, value);
    }
  }

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
