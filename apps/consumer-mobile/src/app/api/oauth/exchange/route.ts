import { NextResponse } from 'next/server';

import { appendSetCookies } from '../../../../lib/api-utils';
import { getEnv } from '../../../../lib/env.server';

export async function POST(req: Request) {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }

  const url = new URL(`${baseUrl}/consumer/auth/oauth/exchange`);

  // Forward client headers but strip hop-by-hop headers that must not be proxied.
  // In particular, 'host' must not be forwarded — it should reflect the target server,
  // not the consumer-mobile origin, otherwise some reverse-proxies reject the request.
  const forwardHeaders = new Headers(req.headers);
  forwardHeaders.delete(`host`);

  const res = await fetch(url, {
    method: `POST`,
    headers: forwardHeaders,
    body: await req.clone().text(),
    cache: `no-store`,
  });

  const data = await res.text();
  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, res.headers);
  return new NextResponse(data, { status: res.status, headers: responseHeaders });
}
