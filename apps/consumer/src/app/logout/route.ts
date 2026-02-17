import { NextResponse } from 'next/server';

import { COOKIE_KEYS } from '@remoola/api-types';

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (apiBase && apiBase.length > 0) {
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

  // Clear cookies
  response.cookies.set(COOKIE_KEYS.ACCESS_TOKEN, ``, { path: `/`, maxAge: 0 });
  response.cookies.set(COOKIE_KEYS.REFRESH_TOKEN, ``, { path: `/`, maxAge: 0 });
  response.cookies.set(COOKIE_KEYS.GOOGLE_OAUTH_STATE, ``, { path: `/`, maxAge: 0 });

  return response;
}
