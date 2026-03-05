import { NextResponse } from 'next/server';

import { COOKIE_KEYS } from '@remoola/api-types';

import { getEnv } from '../../lib/env.server';

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const env = getEnv();
  const apiBase = env.NEXT_PUBLIC_API_BASE_URL;

  if (apiBase) {
    try {
      await fetch(new URL(`${apiBase}/consumer/auth/logout`), {
        method: `POST`,
        headers: new Headers(request.headers),
        credentials: `include`,
      });
    } catch {
      // continue with client-side cookie cleanup
    }
  }

  const response = NextResponse.redirect(`${origin}/login`);
  response.cookies.set(COOKIE_KEYS.CONSUMER_ACCESS_TOKEN, ``, { path: `/`, maxAge: 0 });
  response.cookies.set(COOKIE_KEYS.CONSUMER_REFRESH_TOKEN, ``, { path: `/`, maxAge: 0 });
  return response;
}
