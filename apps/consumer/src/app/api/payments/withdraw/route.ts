import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/payments/withdraw`;

  const res = await fetch(url, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
      cookie: req.headers.get(`cookie`) ?? ``,
    },
    body: await req.text(),
  });

  const cookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  const headers: HeadersInit = {};
  if (cookie) headers[`set-cookie`] = cookie;
  return new NextResponse(data, { status: res.status, headers });
}
