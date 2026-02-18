import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/payments/balance`);

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
