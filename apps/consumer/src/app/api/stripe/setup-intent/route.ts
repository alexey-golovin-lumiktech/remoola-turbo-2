import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies, buildForwardHeaders } from '../../../../lib/api-utils';

export async function POST(req: NextRequest) {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/stripe/intents`);

  const res = await fetch(url, {
    method: `POST`,
    headers: buildForwardHeaders(req.headers),
    credentials: `include`,
    cache: `no-store`,
  });

  const data = await res.text();
  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, res.headers);
  return new NextResponse(data, { status: res.status, headers: responseHeaders });
}
