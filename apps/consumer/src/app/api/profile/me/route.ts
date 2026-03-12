import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies, buildForwardHeaders } from '../../../../lib/api-utils';

export async function GET(req: NextRequest) {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/profile/me`);

  const response = await fetch(url, {
    method: `GET`,
    headers: buildForwardHeaders(req.headers),
    credentials: `include`,
    cache: `no-store`,
  });

  const data = await response.text();
  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, response.headers);
  return new NextResponse(data, { status: response.status, headers: responseHeaders });
}
