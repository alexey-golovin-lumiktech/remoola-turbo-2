import { type NextRequest, NextResponse } from 'next/server';

import { COOKIE_KEYS } from '@remoola/api-types';

export function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE_KEYS.ACCESS_TOKEN)?.value;

  const isAuthPage = req.nextUrl.pathname.startsWith(`/login`) || req.nextUrl.pathname.startsWith(`/signup`);
  const isCallback = req.nextUrl.pathname.startsWith(`/auth/callback`);
  const isProtected = !isAuthPage;

  // Allow callback even without cookie (it will wait and then redirect)
  if (isCallback) return NextResponse.next();

  if (isProtected && !token) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(req.nextUrl.pathname)}`, req.url));
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL(`/dashboard`, req.url));
  }

  return NextResponse.next();
}

export const config = { matcher: [`/((?!_next|favicon.ico|assets|api/.*).*)`] };
