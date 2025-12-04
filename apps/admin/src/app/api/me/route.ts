import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const api = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const cookieHeader = (await cookies()).toString();

  const res = await fetch(`${api}/auth/me`, {
    headers: { cookie: cookieHeader },
    credentials: `include`,
  });

  const data = await res.text();
  return new NextResponse(data, { status: res.status });
}
