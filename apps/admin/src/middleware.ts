import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = [`/login`, `/api/auth/login`];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Adjust this cookie name to whatever your backend sets for admin auth.
  // Example: "access_token", "authorization", etc.
  const hasSessionCookie = req.cookies.get(`access_token`)?.value || req.cookies.get(`authorization`)?.value;

  // Protect both pages and /api routes under (protected)
  if (!hasSessionCookie && !pathname.startsWith(`/api/`)) {
    const url = req.nextUrl.clone();
    url.pathname = `/login`;
    const intended = pathname === `/` ? `/dashboard` : pathname;
    url.searchParams.set(`next`, intended);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [`/((?!_next/static|_next/image|favicon.ico).*)`],
};
