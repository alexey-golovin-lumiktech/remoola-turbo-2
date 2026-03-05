import { type NextRequest, NextResponse } from 'next/server';

import { parsePaymentMethodParams } from '../../../../features/payment-methods/schemas';
import { getEnv } from '../../../../lib/env.server';

async function proxyPaymentMethod(paymentMethodId: string, req: NextRequest, method: string) {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }
  const url = new URL(`${baseUrl}/consumer/payment-methods/${paymentMethodId}`);
  const res = await fetch(url, {
    method,
    headers: new Headers(req.headers),
    credentials: `include`,
    cache: method === `GET` ? `no-store` : undefined,
    ...(method !== `GET` && method !== `DELETE` && { body: await req.clone().text() }),
  });
  const cookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  const headers: HeadersInit = {};
  if (cookie) headers[`set-cookie`] = cookie;
  return new NextResponse(data, { status: res.status, headers });
}

export async function GET(req: NextRequest, context: { params: Promise<{ paymentMethodId: string }> }) {
  const raw = await context.params;
  const parsed = parsePaymentMethodParams(raw);
  if (`error` in parsed) {
    return NextResponse.json({ code: `VALIDATION_ERROR`, message: parsed.error }, { status: 400 });
  }
  return proxyPaymentMethod(parsed.paymentMethodId, req, `GET`);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ paymentMethodId: string }> }) {
  const raw = await context.params;
  const parsed = parsePaymentMethodParams(raw);
  if (`error` in parsed) {
    return NextResponse.json({ code: `VALIDATION_ERROR`, message: parsed.error }, { status: 400 });
  }
  return proxyPaymentMethod(parsed.paymentMethodId, req, `PATCH`);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ paymentMethodId: string }> }) {
  const raw = await context.params;
  const parsed = parsePaymentMethodParams(raw);
  if (`error` in parsed) {
    return NextResponse.json({ code: `VALIDATION_ERROR`, message: parsed.error }, { status: 400 });
  }
  return proxyPaymentMethod(parsed.paymentMethodId, req, `DELETE`);
}
