// apps/admin/src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

const logger = console;

export function middleware(req: NextRequest) {
  const token = req.cookies.get(`access_token`)?.value;
  logger.log(`\n************************************`);
  logger.log(`token`, token);
  logger.log(`req.nextUrl`, req.nextUrl);
  logger.log(`************************************\n`);
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
