import { NextResponse } from 'next/server';

import { appendSetCookies, buildForwardHeaders } from '../../../../lib/api-utils';

export async function POST(req: Request) {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/auth/oauth/exchange`);
  const forwardHeaders = buildForwardHeaders(req.headers);
  forwardHeaders.delete(`host`);

  const res = await fetch(url, {
    method: `POST`,
    headers: forwardHeaders,
    body: await req.clone().text(),
    cache: `no-store`,
  });

  const data = await res.text();
  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, res.headers);
  return new NextResponse(data, { status: res.status, headers: responseHeaders });
}
