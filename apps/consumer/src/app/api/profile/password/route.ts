import { type NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest) {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/profile/password`);
  console.log(`PATCH`, url.href);

  const res = await fetch(url, {
    method: `PATCH`,
    headers: new Headers(req.headers),
    credentials: `include`,
    body: await req.text(),
  });

  const cookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  const headers: HeadersInit = {};
  if (cookie) headers[`set-cookie`] = cookie;
  return new NextResponse(data, { status: res.status, headers });
}
