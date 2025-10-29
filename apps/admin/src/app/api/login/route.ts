import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL!; // your NestJS backend URL

  // Forward the login request to NestJS
  const res = await fetch(`${base}/auth/login`, {
    method: `POST`,
    headers: {
      'Content-Type': `application/json`,
    },
    body: await req.text(), // pass through body
    credentials: `include`,
  });

  // Copy Set-Cookie headers so the browser stores them for the *admin* domain
  const setCookie = res.headers.get(`set-cookie`);
  const text = await res.text();

  return new NextResponse(text, {
    status: res.status,
    headers: setCookie ? { 'set-cookie': setCookie } : {},
  });
}
