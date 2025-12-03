import { type NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest, context: { params: Promise<{ paymentMethodId: string }> }) {
  const params = await context.params;
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/payment-methods/${params.paymentMethodId}`;
  console.log(`PATCH`, url);

  const res = await fetch(url, {
    method: `PATCH`,
    headers: Object.fromEntries(req.headers),
    credentials: `include`,
    body: await req.clone().text(),
  });

  const cookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  const headers: HeadersInit = {};
  if (cookie) headers[`set-cookie`] = cookie;
  return new NextResponse(data, { status: res.status, headers });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ paymentMethodId: string }> }) {
  const params = await context.params;
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/payment-methods/${params.paymentMethodId}`;
  console.log(`DELETE`, url);

  const res = await fetch(url, {
    method: `DELETE`,
    headers: Object.fromEntries(req.headers),
    credentials: `include`,
  });

  const cookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  const headers: HeadersInit = {};
  if (cookie) headers[`set-cookie`] = cookie;
  return new NextResponse(data, { status: res.status, headers });
}
