import { type NextRequest, NextResponse } from 'next/server';

import { paymentParamsSchema } from '../../../../../features/payments';
import { getEnv } from '../../../../../lib/env.server';

export async function POST(req: NextRequest, context: { params: Promise<{ paymentRequestId: string }> }) {
  const raw = await context.params;
  const parsed = paymentParamsSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ code: `VALIDATION_ERROR`, message: `Invalid paymentRequestId` }, { status: 400 });
  }
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }
  const url = new URL(`${baseUrl}/consumer/stripe/${parsed.data.paymentRequestId}/stripe-session`);
  const res = await fetch(url, {
    method: `POST`,
    headers: new Headers(req.headers),
    credentials: `include`,
  });
  const cookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  return new NextResponse(data, { status: res.status, headers: cookie ? { 'set-cookie': cookie } : {} });
}
