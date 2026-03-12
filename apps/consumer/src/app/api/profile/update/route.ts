import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies, requireJsonBody, buildForwardHeaders } from '../../../../lib/api-utils';

export async function PATCH(req: NextRequest) {
  const bodyResult = await requireJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/profile/update`);

  const res = await fetch(url, {
    method: `PATCH`,
    body: bodyResult.body,
    headers: buildForwardHeaders(req.headers),
    credentials: `include`,
    cache: `no-store`,
  });

  const data = await res.text();
  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, res.headers);
  return new NextResponse(data, { status: res.status, headers: responseHeaders });
}
