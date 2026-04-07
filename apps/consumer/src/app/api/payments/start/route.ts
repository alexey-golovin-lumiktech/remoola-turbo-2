import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies, requireJsonBody, buildForwardHeaders } from '../../../../lib/api-utils';

const APP_SCOPE = `consumer`;

export async function POST(req: NextRequest) {
  const bodyResult = await requireJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/payments/start`);
  url.searchParams.set(`appScope`, APP_SCOPE);

  const res = await fetch(url, {
    method: `POST`,
    headers: buildForwardHeaders(req.headers),
    credentials: `include`,
    cache: `no-store`,
    body: bodyResult.body,
  });

  const data = await res.text();
  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, res.headers);
  return new NextResponse(data, { status: res.status, headers: responseHeaders });
}
