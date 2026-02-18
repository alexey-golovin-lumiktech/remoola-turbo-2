import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, context: { params: Promise<{ paymentRequestId: string }> }) {
  const params = await context.params;

  const url = new URL(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/stripe/${params.paymentRequestId}/pay-with-saved-method`,
  );

  const res = await fetch(url, {
    method: `POST`,
    headers: new Headers(req.headers),
    credentials: `include`,
    body: await req.clone().text(),
  });

  const cookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: cookie ? { 'set-cookie': cookie } : {},
  });
}
