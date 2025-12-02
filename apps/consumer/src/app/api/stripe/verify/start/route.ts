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

  const base = process.env.NEXT_PUBLIC_API_BASE_URL || ``;
  const res = await fetch(`${base}/webhooks/stripe/verify/start`, {
    method: `POST`,
    headers: headers,
    credentials: `include`,
  });

  return new NextResponse(await res.text(), { status: res.status });
}
