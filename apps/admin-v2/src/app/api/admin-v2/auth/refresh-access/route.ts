import { NextResponse } from 'next/server';

import { appendSetCookies, buildAuthMutationForwardHeaders } from '../../../../../lib/api-utils';
import { getEnv } from '../../../../../lib/env.server';

export async function POST(req: Request) {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }

  const forwardHeaders = buildAuthMutationForwardHeaders(new Headers(req.headers));
  const res = await fetch(new URL(`${baseUrl}/admin-v2/auth/refresh-access`), {
    method: `POST`,
    headers: forwardHeaders,
    cache: `no-store`,
  });

  const data = await res.text();
  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, res.headers);
  return new NextResponse(data, { status: res.status, headers: responseHeaders });
}
