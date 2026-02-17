import { NextResponse } from 'next/server';

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
  response.cookies.set(`access_token`, ``, { path: `/`, maxAge: 0 });
  response.cookies.set(`refresh_token`, ``, { path: `/`, maxAge: 0 });
  response.cookies.set(`google_oauth_state`, ``, { path: `/`, maxAge: 0 });

  return response;
}
