import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies, requireJsonBody, buildForwardHeaders } from '../../../lib/api-utils';
import { getEnv } from '../../../lib/env.server';

async function proxyPaymentMethods(req: NextRequest, method: string, body?: string) {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }
  const url = new URL(`${baseUrl}/consumer/payment-methods`);
  const res = await fetch(url, {
    method,
    headers: buildForwardHeaders(req.headers),
    credentials: `include`,
    cache: `no-store`,
    ...(body !== undefined && { body }),
  });
  const data = await res.text();
  const responseHeaders = new Headers();
  appendSetCookies(responseHeaders, res.headers);
  return new NextResponse(data, { status: res.status, headers: responseHeaders });
}

export async function GET(req: NextRequest) {
  return proxyPaymentMethods(req, `GET`);
}

export async function POST(req: NextRequest) {
  const bodyResult = await requireJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;
  return proxyPaymentMethods(req, `POST`, bodyResult.body);
}
