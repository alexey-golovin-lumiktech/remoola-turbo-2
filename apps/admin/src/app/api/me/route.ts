import { NextResponse } from 'next/server';

export async function GET() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const res = await fetch(`${base}/auth/me`, { credentials: `include` });
  const data = await res.text();
  return new NextResponse(data, { status: res.status });
}
