import { type NextRequest, NextResponse } from 'next/server';

export async function proxyToBackend(req: NextRequest, backendPath: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const url = base + backendPath; //  new URL(backendPath, base);

  const headers = new Headers(req.headers);

  // Ensure we forward cookies for cookie-auth
  // (Next automatically provides cookies in req.headers)
  const body = req.method === `GET` || req.method === `HEAD` ? undefined : await req.text();

  console.log(`\n************************************`);
  console.log(`url`, url);
  console.log(`body`, body);

  const res = await fetch(url, {
    method: req.method,
    headers,
    body,
    credentials: `include`,
    redirect: `manual`,
  });

  const text = await res.text();

  // Forward set-cookie back to browser
  const setCookie = res.headers.get(`set-cookie`);
  const outHeaders: HeadersInit = {};
  if (setCookie) outHeaders[`set-cookie`] = setCookie;

  // Preserve content-type if present
  const ct = res.headers.get(`content-type`);
  if (ct) outHeaders[`content-type`] = ct;

  return new NextResponse(text, { status: res.status, headers: outHeaders });
}
