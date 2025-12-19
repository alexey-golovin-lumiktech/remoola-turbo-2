import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/stripe/intents`);
  console.log(`POST`, url.href);

  const res = await fetch(url, {
    method: `POST`,
    headers: new Headers(req.headers),
    credentials: `include`,
  });

  const cookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  return new NextResponse(data, { status: res.status, headers: cookie ? { 'set-cookie': cookie } : {} });
}
