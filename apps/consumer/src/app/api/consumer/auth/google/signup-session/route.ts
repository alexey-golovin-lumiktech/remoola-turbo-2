import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies, buildForwardHeaders } from '../../../../../../lib/api-utils';

const APP_SCOPE = `consumer`;

export async function GET(req: NextRequest) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBase || apiBase.length === 0) {
    return NextResponse.json({ message: `API not configured` }, { status: 503 });
  }

  const url = new URL(`${apiBase}/consumer/auth/google/signup-session`);
  url.searchParams.set(`appScope`, APP_SCOPE);

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
