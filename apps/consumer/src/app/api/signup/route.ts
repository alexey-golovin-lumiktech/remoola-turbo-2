import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/signup`);
  console.log(`POST`, url.href);

  const res = await fetch(url, {
    method: `POST`,
    headers: new Headers(req.headers),
    body: await req.clone().text(),
    credentials: `include`,
  });

  const cookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  const headers: HeadersInit = {};
  if (cookie) headers[`set-cookie`] = cookie;
  return new NextResponse(data, { status: res.status, headers });
}
