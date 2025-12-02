import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/me`;
  console.log(`GET`, url);

  const res = await fetch(url, {
    method: `GET`,
    headers: {
      ...Object.fromEntries(req.headers),
      'Content-Type': `application/json`,
      Cookie: (await cookies()).toString(),
      referrer: `http://127.0.0.1:3001`,
    },
    credentials: `include`,
    cache: `no-cache`,
  });

  const setCookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  return new NextResponse(data, { status: res.status, headers: setCookie ? { 'set-cookie': setCookie } : {} });
}
