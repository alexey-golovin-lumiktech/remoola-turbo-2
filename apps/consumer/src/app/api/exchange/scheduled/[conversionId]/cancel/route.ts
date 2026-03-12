import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies, buildForwardHeaders } from '../../../../../../lib/api-utils';

function getValidConversionId(params: { conversionId: string }): string | null {
  const conversionId = params.conversionId?.trim();
  return conversionId.length > 0 ? conversionId : null;
}

export async function POST(req: NextRequest, context: { params: Promise<{ conversionId: string }> }) {
  const conversionId = getValidConversionId(await context.params);
  if (!conversionId) {
    return NextResponse.json({ code: `VALIDATION_ERROR`, message: `Invalid route params` }, { status: 400 });
  }
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/exchange/scheduled/${conversionId}/cancel`);

  const res = await fetch(url, {
    method: `POST`,
    headers: buildForwardHeaders(req.headers),
    credentials: `include`,
    cache: `no-store`,
  });

  const data = await res.text();
  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, res.headers);
  return new NextResponse(data, { status: res.status, headers: responseHeaders });
}
