import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies, requireJsonBody, buildForwardHeaders } from '../../../../lib/api-utils';

export async function PUT(req: NextRequest) {
  const bodyResult = await requireJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/settings/preferred-currency`);

  const response = await fetch(url, {
    method: `PUT`,
    headers: buildForwardHeaders(req.headers),
    credentials: `include`,
    cache: `no-store`,
    body: bodyResult.body,
  });

  const data = await response.text();
  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, response.headers);
  return new NextResponse(data, { status: response.status, headers: responseHeaders });
}
