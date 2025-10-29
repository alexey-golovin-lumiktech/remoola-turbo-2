// apps/admin/src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

const logger = console;

export function middleware(req: NextRequest) {
  const cookieStore = req.cookies; // ✅ await the async cookies() call
  const accessToken = cookieStore.get(`access_token`)?.value;
  const tokenPublic = cookieStore.get(`access_token_public`)?.value;
  const token = accessToken || tokenPublic;
  logger.log(`middleware token`, token);
  logger.log(`middleware req.nextUrl`, req.nextUrl);
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

export const runtime = `nodejs`;
