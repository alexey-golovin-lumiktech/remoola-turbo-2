import { type NextRequest, NextResponse } from 'next/server';

const PROTECTED_ROUTES = [
  `/`, //
  `/admins`,
  `/clients`,
  `/contractors`,
  `/contracts`,
  `/payments`,
  `/documents`,
];

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const hasAccess = req.cookies.get(`access_token`);
  const isProtected = PROTECTED_ROUTES.some((p) => path == p || path.startsWith(p + `/`));

  if (isProtected && !hasAccess) {
    const url = req.nextUrl.clone();
    url.pathname = `/login`;
    url.searchParams.set(`next`, path);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [`/((?!_next|favicon.ico|assets|api/.*).*)`],
};
