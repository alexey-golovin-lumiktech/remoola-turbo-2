import { type NextRequest, NextResponse } from 'next/server';

import { getEnv } from '../../../../../../lib/env.server';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get(`token`);
  if (!token) {
    return NextResponse.json({ message: `Missing signup token` }, { status: 400 });
  }
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: `API not configured` }, { status: 503 });
  }
  const url = new URL(`${baseUrl}/consumer/auth/google/signup-session`);
  url.searchParams.set(`token`, token);
  const res = await fetch(url, {
    method: `GET`,
    headers: new Headers(req.headers),
    credentials: `include`,
    cache: `no-store`,
  });
  const cookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  const headers: HeadersInit = {};
  if (cookie) headers[`set-cookie`] = cookie;
  return new NextResponse(data, { status: res.status, headers });
}
