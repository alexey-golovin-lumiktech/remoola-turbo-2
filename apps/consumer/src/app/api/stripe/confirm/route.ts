import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const cookieHeader = (await cookies()).toString();

  const entries = Object.fromEntries(req.headers);
  const headers: Record<string, string> = {
    'Content-Type': `application/json`,
    Cookie: cookieHeader,
    ...(entries.authorization?.trim() && { authorization: entries.authorization }),
  };

  const body = await req.text();
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || ``;

  const res = await fetch(`${base}/payment-methods/stripe/confirm`, {
    method: `POST`,
    headers: headers,
    credentials: `include`,
    body,
  });

  const setCookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  return new NextResponse(data, { status: res.status, headers: setCookie ? { 'set-cookie': setCookie } : {} });
}
