import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies, buildAuthMutationForwardHeaders } from '../../../../../../lib/api-utils';
import { getEnv } from '../../../../../../lib/env.server';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get(`token`);
  if (!token) {
    return NextResponse.json({ message: `Missing signup token`, code: `MISSING_SIGNUP_TOKEN` }, { status: 400 });
  }

  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }

  const url = new URL(`${baseUrl}/consumer/auth/google/signup-session`);
  url.searchParams.set(`token`, token);

  const forwardHeaders = buildAuthMutationForwardHeaders(req.headers);

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
