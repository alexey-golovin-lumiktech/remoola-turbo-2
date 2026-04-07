import { type NextRequest, NextResponse } from 'next/server';

import { paymentParamsSchema } from '../../../../../features/payments/schemas';
import { appendSetCookies, requireJsonBody, buildForwardHeaders } from '../../../../../lib/api-utils';
import { getEnv } from '../../../../../lib/env.server';

const APP_SCOPE = `consumer-mobile`;

export async function POST(req: NextRequest, context: { params: Promise<{ paymentRequestId: string }> }) {
  const raw = await context.params;
  const parsed = paymentParamsSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ code: `VALIDATION_ERROR`, message: `Invalid paymentRequestId` }, { status: 400 });
  }
  const bodyResult = await requireJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }
  const url = new URL(`${baseUrl}/consumer/stripe/${parsed.data.paymentRequestId}/pay-with-saved-method`);
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
