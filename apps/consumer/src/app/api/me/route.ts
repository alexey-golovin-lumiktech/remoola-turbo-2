import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies } from '../../../lib/api-utils';

export async function GET(req: NextRequest) {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/auth/me`);
  const forwardHeaders = new Headers(req.headers);
  forwardHeaders.delete(`host`);

  const res = await fetch(url, {
    method: `GET`,
    headers: forwardHeaders,
    cache: `no-store`,
  });

  const data = await res.text();
  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, res.headers);
  return new NextResponse(data, { status: res.status, headers: responseHeaders });
}
