import { NextResponse, type NextRequest } from 'next/server';

import { appendSetCookies, buildForwardHeaders, requireJsonBody } from '../../../../../lib/api-utils';

function getValidDocId(params: { docId: string }): string | null {
  const docId = params.docId?.trim();
  return docId.length > 0 ? docId : null;
}

export async function POST(req: NextRequest, context: { params: Promise<{ docId: string }> }) {
  const bodyResult = await requireJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;
  const docId = getValidDocId(await context.params);
  if (!docId) {
    return NextResponse.json({ code: `VALIDATION_ERROR`, message: `Invalid route params` }, { status: 400 });
  }
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/documents/${docId}/tags`);

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
