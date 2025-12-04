import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const token = req.cookies.get(`access_token`)?.value;

  const isAuthPage = req.nextUrl.pathname.startsWith(`/login`);
  const isCallback = req.nextUrl.pathname.startsWith(`/auth/callback`);
  const isProtected = req.nextUrl.pathname.startsWith(`/profile`) || req.nextUrl.pathname.startsWith(`/contacts`);

  // Allow callback even without cookie (it will wait and then redirect)
  if (isCallback) return NextResponse.next();

  if (isProtected && !token) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(req.nextUrl.pathname)}`, req.url));
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL(`/profile`, req.url));
  }

  return NextResponse.next();
}

export const config = { matcher: [`/((?!_next|favicon.ico|assets|api/.*).*)`] };
