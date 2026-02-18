import { type NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/settings/theme`);

  const response = await fetch(url, {
    method: `GET`,
    headers: new Headers(req.headers),
    credentials: `include`,
    cache: `no-store`,
  });

  const cookie = response.headers.get(`set-cookie`);
  const data = await response.text();
  const headers: HeadersInit = {};
  if (cookie) headers[`set-cookie`] = cookie;
  return new NextResponse(data, { status: response.status, headers });
}

export async function PUT(req: NextRequest) {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/settings/theme`);

  const response = await fetch(url, {
    method: `PUT`,
    headers: new Headers(req.headers),
    credentials: `include`,
    body: await req.clone().text(),
  });

  const cookie = response.headers.get(`set-cookie`);
  const data = await response.text();
  const headers: HeadersInit = {};
  if (cookie) headers[`set-cookie`] = cookie;
  return new NextResponse(data, { status: response.status, headers });
}
