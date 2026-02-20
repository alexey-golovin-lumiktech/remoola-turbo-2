import { type NextRequest, NextResponse } from 'next/server';

import { COOKIE_KEYS } from '@remoola/api-types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
/** Fintech-safe: match API defaults (15m access, 7d refresh). Set-Cookie maxAge is in seconds. */
const ACCESS_MAX_AGE_SEC = 15 * 60;
const REFRESH_MAX_AGE_SEC = 7 * 24 * 60 * 60;

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(COOKIE_KEYS.CONSUMER_REFRESH_TOKEN)?.value;
  if (!refreshToken) {
    return NextResponse.json({ message: `Refresh token required` }, { status: 401 });
  }

  if (!API_BASE) {
    return NextResponse.json({ message: `Server configuration error` }, { status: 500 });
  }

  try {
    const url = new URL(`${API_BASE}/consumer/auth/refresh-access`);
    const res = await fetch(url, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ message: data?.message ?? `Session expired` }, { status: res.status });
    }

    const data = (await res.json()) as { accessToken?: string; refreshToken?: string };
    const accessToken = data?.accessToken;
    const newRefreshToken = data?.refreshToken;

    if (!accessToken) {
      return NextResponse.json({ message: `Invalid refresh response` }, { status: 502 });
    }

    const isProd = process.env.NODE_ENV === `production`;
    const cookieOpts = {
      path: `/`,
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? (`none` as const) : (`lax` as const),
    } as const;

    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_KEYS.CONSUMER_ACCESS_TOKEN, accessToken, {
      ...cookieOpts,
      maxAge: ACCESS_MAX_AGE_SEC,
    });
    response.cookies.set(COOKIE_KEYS.CONSUMER_REFRESH_TOKEN, newRefreshToken ?? refreshToken, {
      ...cookieOpts,
      maxAge: REFRESH_MAX_AGE_SEC,
    });
    return response;
  } catch {
    return NextResponse.json({ message: `Refresh failed` }, { status: 503 });
  }
}
