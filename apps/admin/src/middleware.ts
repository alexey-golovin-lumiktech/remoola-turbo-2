import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const cookieStore = req.cookies;
  const accessToken = cookieStore.get(`access_token`)?.value;
  const tokenPublic = cookieStore.get(`access_token_public`)?.value;
  const token = accessToken || tokenPublic;
  const { pathname } = req.nextUrl;

  if (!token && !pathname.startsWith(`/login`)) {
    const url = req.nextUrl.clone();
    url.pathname = `/login`;
    url.searchParams.set(`next`, pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [`/((?!_next|favicon.ico|assets|api/.*).*)`],
};
