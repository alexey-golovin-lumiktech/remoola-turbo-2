import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies, buildForwardHeaders } from '../../../../../lib/api-utils';

function getValidContactId(params: { contactId: string }): string | null {
  const contactId = params.contactId?.trim();
  return contactId.length > 0 ? contactId : null;
}

export async function GET(req: NextRequest, context: { params: Promise<{ contactId: string }> }) {
  const contactId = getValidContactId(await context.params);
  if (!contactId) {
    return NextResponse.json({ code: `VALIDATION_ERROR`, message: `Invalid route params` }, { status: 400 });
  }
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/contacts/${contactId}/details`);

  const res = await fetch(url, {
    method: `GET`,
    headers: buildForwardHeaders(req.headers),
    credentials: `include`,
    cache: `no-store`,
  });

  const data = await res.text();
  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, res.headers);
  return new NextResponse(data, { status: res.status, headers: responseHeaders });
}
