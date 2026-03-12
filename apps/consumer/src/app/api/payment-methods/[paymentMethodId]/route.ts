import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies, buildForwardHeaders, requireJsonBody } from '../../../../lib/api-utils';

function getValidPaymentMethodId(params: { paymentMethodId: string }): string | null {
  const paymentMethodId = params.paymentMethodId?.trim();
  return paymentMethodId.length > 0 ? paymentMethodId : null;
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ paymentMethodId: string }> }) {
  const bodyResult = await requireJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;
  const paymentMethodId = getValidPaymentMethodId(await context.params);
  if (!paymentMethodId) {
    return NextResponse.json({ code: `VALIDATION_ERROR`, message: `Invalid route params` }, { status: 400 });
  }
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/payment-methods/${paymentMethodId}`);

  const res = await fetch(url, {
    method: `PATCH`,
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

export async function DELETE(req: NextRequest, context: { params: Promise<{ paymentMethodId: string }> }) {
  const paymentMethodId = getValidPaymentMethodId(await context.params);
  if (!paymentMethodId) {
    return NextResponse.json({ code: `VALIDATION_ERROR`, message: `Invalid route params` }, { status: 400 });
  }
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/payment-methods/${paymentMethodId}`);

  const res = await fetch(url, {
    method: `DELETE`,
    headers: buildForwardHeaders(req.headers),
    credentials: `include`,
    cache: `no-store`,
  });

  const data = await res.text();
  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, res.headers);
  return new NextResponse(data, { status: res.status, headers: responseHeaders });
}

export async function GET(req: NextRequest, context: { params: Promise<{ paymentMethodId: string }> }) {
  const paymentMethodId = getValidPaymentMethodId(await context.params);
  if (!paymentMethodId) {
    return NextResponse.json({ code: `VALIDATION_ERROR`, message: `Invalid route params` }, { status: 400 });
  }
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/payment-methods/${paymentMethodId}`);

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
