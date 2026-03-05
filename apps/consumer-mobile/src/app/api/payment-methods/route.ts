import { type NextRequest, NextResponse } from 'next/server';

import { getEnv } from '../../../lib/env.server';

async function proxyPaymentMethods(req: NextRequest, method: string) {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }
  const url = new URL(`${baseUrl}/consumer/payment-methods`);
  const res = await fetch(url, {
    method,
    headers: new Headers(req.headers),
    credentials: `include`,
    cache: method === `GET` ? `no-store` : undefined,
    ...(method !== `GET` && { body: await req.clone().text() }),
  });
  const cookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  const headers: HeadersInit = {};
  if (cookie) headers[`set-cookie`] = cookie;
  return new NextResponse(data, { status: res.status, headers });
}

export async function GET(req: NextRequest) {
  return proxyPaymentMethods(req, `GET`);
}

export async function POST(req: NextRequest) {
  return proxyPaymentMethods(req, `POST`);
}
