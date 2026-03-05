import { type NextRequest, NextResponse } from 'next/server';

import { parseConversionIdParams } from '../../../../../../features/exchange/schemas';
import { getEnv } from '../../../../../../lib/env.server';

export async function POST(req: NextRequest, context: { params: Promise<{ conversionId: string }> }) {
  const raw = await context.params;
  const parsed = parseConversionIdParams(raw);
  if (`error` in parsed) {
    return NextResponse.json({ code: `VALIDATION_ERROR`, message: parsed.error }, { status: 400 });
  }
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }
  const url = new URL(`${baseUrl}/consumer/exchange/scheduled/${parsed.conversionId}/cancel`);
  const res = await fetch(url, {
    method: `POST`,
    headers: new Headers(req.headers),
    credentials: `include`,
  });
  const cookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  const headers: HeadersInit = {};
  if (cookie) headers[`set-cookie`] = cookie;
  return new NextResponse(data, { status: res.status, headers });
}
