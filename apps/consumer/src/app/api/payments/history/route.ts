import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const reqUrlSearch = new URL(req.url).search; // pass through query
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/payments/history${reqUrlSearch}`;
  console.log(`GET`, url);

  const res = await fetch(url, {
    method: `GET`,
    headers: {
      cookie: req.headers.get(`cookie`)!,
      'content-type': `application/json`,
    },
    credentials: `include`,
    cache: `no-store`,
  });

  console.log(`\n************************************`);
  console.log(`res.ok`, await res.clone().text());
  console.log(`************************************\n`);

  const cookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  const headers: HeadersInit = {};
  if (cookie) headers[`set-cookie`] = cookie;
  return new NextResponse(data, { status: res.status, headers });
}
