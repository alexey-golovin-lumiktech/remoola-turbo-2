// apps/admin/src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const token = req.cookies.get(`access_token`)?.value;
  const { pathname } = req.nextUrl;

  if (!token && !pathname.startsWith(`/login`)) {
    const url = req.nextUrl.clone();
    url.pathname = `/login`;
    url.searchParams.set(`next`, pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
