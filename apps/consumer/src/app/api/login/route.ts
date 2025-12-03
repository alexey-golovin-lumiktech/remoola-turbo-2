import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/login`;
  console.log(`POST`, url);

  const res = await fetch(url, {
    method: `POST`,
    headers: { ...Object.fromEntries(req.headers), 'content-type': `application/json` },
    credentials: `include`,
    body: await req.clone().text(),
  });

  const cookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  const headers: HeadersInit = {};
  if (cookie) headers[`set-cookie`] = cookie;
  return new NextResponse(data, { status: res.status, headers });
}
