import { type NextRequest, NextResponse } from 'next/server';

import { getEnv } from '../../../../lib/env.server';

export async function POST(req: NextRequest) {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }
  const url = new URL(`${baseUrl}/consumer/documents/upload`);
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
