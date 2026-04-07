import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies, buildForwardHeaders, requireJsonBody } from '../../../../../lib/api-utils';

const APP_SCOPE = `consumer`;

function getValidPaymentRequestId(params: { paymentRequestId: string }): string | null {
  const paymentRequestId = params.paymentRequestId?.trim();
  return paymentRequestId.length > 0 ? paymentRequestId : null;
}

export async function POST(req: NextRequest, context: { params: Promise<{ paymentRequestId: string }> }) {
  const bodyResult = await requireJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;
  const paymentRequestId = getValidPaymentRequestId(await context.params);
  if (!paymentRequestId) {
    return NextResponse.json({ code: `VALIDATION_ERROR`, message: `Invalid route params` }, { status: 400 });
  }

  const url = new URL(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/stripe/${paymentRequestId}/pay-with-saved-method`,
  );
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
