// apps/consumer/src/app/logout/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { origin } = new URL(request.url);

  const response = NextResponse.redirect(`${origin}/login`);

  // Clear cookies
  response.cookies.set(`access_token`, ``, { path: `/`, maxAge: 0 });
  response.cookies.set(`refresh_token`, ``, { path: `/`, maxAge: 0 });

  return response;
}
