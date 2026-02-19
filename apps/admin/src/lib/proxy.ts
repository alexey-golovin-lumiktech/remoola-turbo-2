import { type NextRequest, NextResponse } from 'next/server';

export async function proxyToBackend(req: NextRequest, backendPath: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const search = req.nextUrl?.search ?? ``;
  const url = base + backendPath + search;

  const headers = new Headers(req.headers);

  // Ensure we forward cookies for cookie-auth
  // (Next automatically provides cookies in req.headers)
  const body = req.method === `GET` || req.method === `HEAD` ? undefined : await req.text();

  const response = await fetch(url, {
    method: req.method,
    headers,
    body,
    credentials: `include`,
    redirect: `manual`,
  });

  const text = await response.text();

  // Forward set-cookie back to browser
  const setCookie = response.headers.get(`set-cookie`);
  const outHeaders: HeadersInit = {};
  if (setCookie) outHeaders[`set-cookie`] = setCookie;

  // Preserve content-type if present
  const contentTypeHeaders = response.headers.get(`content-type`);
  if (contentTypeHeaders) outHeaders[`content-type`] = contentTypeHeaders;

  return new NextResponse(text, { status: response.status, headers: outHeaders });
}
