import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL!;

  const res = await fetch(`${base}/auth/login`, {
    method: `POST`,
    headers: {
      'content-type': `application/json`,
    },
    body: await req.text(),
    credentials: `include`,
  });

  const setCookie = res.headers.get(`set-cookie`);
  const text = await res.text();

  return new NextResponse(text, {
    status: res.status,
    headers: setCookie ? { 'set-cookie': setCookie } : {},
  });
}
