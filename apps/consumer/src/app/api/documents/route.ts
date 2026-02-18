import { type NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/documents`);

  const params = Object.fromEntries(new URL(req.url).searchParams);
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      if (url.searchParams.has(key)) url.searchParams.set(key, value);
      else url.searchParams.append(key, value);
    }
  }

  const res = await fetch(url, {
    method: `GET`,
    headers: new Headers(req.headers),
    credentials: `include`,
    cache: `no-store`,
  });

  const cookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  const headers: HeadersInit = {};
  if (cookie) headers[`set-cookie`] = cookie;
  return new NextResponse(data, { status: res.status, headers });
}
