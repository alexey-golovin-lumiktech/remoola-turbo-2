import { NextResponse, type NextRequest } from 'next/server';

export async function POST(req: NextRequest, context: { params: Promise<{ paymentRequestId: string }> }) {
  const params = await context.params;
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/payments/${params.paymentRequestId}/generate-invoice`;
  console.log(`POST`, url);

  const res = await fetch(url, {
    method: `POST`,
    headers: new Headers(req.headers),
    credentials: `include`,
    body: await req.clone().text(),
  });

  const cookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  const headers: HeadersInit = {};
  if (cookie) headers[`set-cookie`] = cookie;
  return new NextResponse(data, { status: res.status, headers });
}
