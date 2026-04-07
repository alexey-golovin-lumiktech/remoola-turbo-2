import { type NextRequest, NextResponse } from 'next/server';

import { buildForwardHeaders, requireJsonBody } from '../../../../../lib/api-utils';
import { getEnv } from '../../../../../lib/env.server';

const APP_SCOPE = `consumer-mobile`;

export async function POST(req: NextRequest) {
  const bodyResult = await requireJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }
  const url = new URL(`${baseUrl}/consumer/auth/forgot-password`);
  url.searchParams.set(`appScope`, APP_SCOPE);
  const res = await fetch(url, {
    method: `POST`,
    headers: buildForwardHeaders(req.headers),
    body: bodyResult.body,
    cache: `no-store`,
  });
  const data = await res.text();
  return new NextResponse(data, { status: res.status });
}
