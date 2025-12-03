import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/webhooks/stripe/verify/start`;
  console.log(`POST`, url);

  const res = await fetch(url, {
    method: `POST`,
    headers: { ...Object.fromEntries(req.headers), 'content-type': `application/json` },
    credentials: `include`,
  });

  const cookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  return new NextResponse(data, { status: res.status, headers: cookie ? { 'set-cookie': cookie } : {} });
}
