import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies, buildForwardHeaders } from '../../../../lib/api-utils';

export async function POST(req: NextRequest) {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/documents/upload`);

  // Re-send FormData to backend API
  const res = await fetch(url, {
    method: `POST`,
    body: req.body,
    credentials: `include`,
    headers: buildForwardHeaders(req.headers),
    duplex: `half`,
    cache: `no-store`,
  } as RequestInit);

  const data = await res.arrayBuffer();
  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, res.headers);
  return new NextResponse(data, { status: res.status, headers: responseHeaders });
}
