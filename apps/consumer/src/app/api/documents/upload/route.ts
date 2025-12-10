import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/documents/upload`);
  console.log(`POST`, url);

  // Re-send FormData to backend API
  const res = await fetch(url, {
    method: `POST`,
    body: req.body,
    credentials: `include`,
    headers: new Headers(req.headers),
    duplex: `half`,
  } as RequestInit);

  const cookie = res.headers.get(`set-cookie`);
  const data = await res.arrayBuffer();
  const headers: HeadersInit = {};
  if (cookie) headers[`set-cookie`] = cookie;
  return new NextResponse(data, { status: res.status, headers });
}
