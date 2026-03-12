import { type NextRequest } from 'next/server';

import { appendSetCookies, buildForwardHeaders } from '../../../lib/api-utils';
import { getEnv } from '../../../lib/env.server';

export async function GET(req: NextRequest) {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return Response.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }
  const reqUrl = new URL(req.url);
  const url = new URL(`${baseUrl}/consumer/contracts${reqUrl.search}`);
  const res = await fetch(url, {
    method: `GET`,
    headers: buildForwardHeaders(req.headers),
    credentials: `include`,
    cache: `no-store`,
  });
  const data = await res.text();
  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, res.headers);
  return new Response(data, { status: res.status, headers: responseHeaders });
}
