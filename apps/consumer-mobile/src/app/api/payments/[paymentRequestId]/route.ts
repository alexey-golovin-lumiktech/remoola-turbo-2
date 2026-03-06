import { type NextRequest } from 'next/server';

import { paymentParamsSchema } from '../../../../features/payments/schemas';
import { getEnv } from '../../../../lib/env.server';

async function proxyPaymentRequest(paymentRequestId: string, req: NextRequest, method: string) {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return Response.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }
  const url = new URL(`${baseUrl}/consumer/payments/${paymentRequestId}`);
  const res = await fetch(url, {
    method,
    headers: new Headers(req.headers),
    credentials: `include`,
    ...(method !== `GET` && method !== `DELETE` && { body: await req.clone().text() }),
  });
  const cookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  const headers: HeadersInit = {};
  if (cookie) headers[`set-cookie`] = cookie;
  return new Response(data, { status: res.status, headers });
}

function parsePaymentParams(params: { paymentRequestId: string }) {
  const parsed = paymentParamsSchema.safeParse(params);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}

export async function GET(req: NextRequest, context: { params: Promise<{ paymentRequestId: string }> }) {
  const params = parsePaymentParams(await context.params);
  if (!params) return Response.json({ code: `VALIDATION_ERROR`, message: `Invalid route params` }, { status: 400 });
  return proxyPaymentRequest(params.paymentRequestId, req, `GET`);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ paymentRequestId: string }> }) {
  const params = parsePaymentParams(await context.params);
  if (!params) return Response.json({ code: `VALIDATION_ERROR`, message: `Invalid route params` }, { status: 400 });
  return proxyPaymentRequest(params.paymentRequestId, req, `PATCH`);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ paymentRequestId: string }> }) {
  const params = parsePaymentParams(await context.params);
  if (!params) return Response.json({ code: `VALIDATION_ERROR`, message: `Invalid route params` }, { status: 400 });
  return proxyPaymentRequest(params.paymentRequestId, req, `DELETE`);
}
