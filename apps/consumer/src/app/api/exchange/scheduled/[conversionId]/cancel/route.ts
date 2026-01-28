import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, context: { params: Promise<{ conversionId: string }> }) {
  const params = await context.params;
  const url = new URL(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/exchange/scheduled/${params.conversionId}/cancel`,
  );

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
