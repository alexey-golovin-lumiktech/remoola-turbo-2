import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/payment-methods/stripe/intents`;
  console.log(`POST`, url);

  const cookieHeader = (await cookies()).toString();
  const res = await fetch(url, {
    method: `POST`,
    headers: {

      'Content-Type': `application/json`,
      Cookie: cookieHeader,
    },
    credentials: `include`,
  });

  const setCookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  return new NextResponse(data, { status: res.status, headers: setCookie ? { 'set-cookie': setCookie } : {} });
}
