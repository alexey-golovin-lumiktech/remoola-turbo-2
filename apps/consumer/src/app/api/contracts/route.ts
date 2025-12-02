import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const cookieHeader = (await cookies()).toString();
  const consumerApi = process.env.NEXT_PUBLIC_API_BASE_URL!;

  const entries = Object.fromEntries(req.headers);
  const headers: Record<string, string> = {
    'Content-Type': `application/json`,
    Cookie: cookieHeader,
    ...(entries.authorization?.trim() && { authorization: entries.authorization }),
  };

  console.log(`\n************************************`);
  console.log(`${consumerApi}/contracts`);
  console.log(`************************************\n`);
  const res = await fetch(`${consumerApi}/contracts`, {
    headers: headers,
    credentials: `include`,
    cache: `no-cache`,
  });

  const setCookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  return new NextResponse(data, { status: res.status, headers: setCookie ? { 'set-cookie': setCookie } : {} });
}
