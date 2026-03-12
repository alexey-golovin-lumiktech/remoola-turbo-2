import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies, requireJsonBody, buildForwardHeaders } from '../../../../lib/api-utils';

export async function GET(req: NextRequest) {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/exchange/rules`);
  const params = Object.fromEntries(new URL(req.url).searchParams);
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== ``) url.searchParams.set(key, value);
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

export async function POST(req: NextRequest) {
  const bodyResult = await requireJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/exchange/rules`);

  const res = await fetch(url, {
    method: `POST`,
    headers: buildForwardHeaders(req.headers),
    credentials: `include`,
    cache: `no-store`,
    body: bodyResult.body,
  });

  const data = await res.text();
  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, res.headers);
  return new NextResponse(data, { status: res.status, headers: responseHeaders });
}
