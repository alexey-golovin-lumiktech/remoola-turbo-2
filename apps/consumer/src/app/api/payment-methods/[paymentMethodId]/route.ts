import { type NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest, context: { params: Promise<{ paymentMethodId: string }> }) {
  const params = await context.params;
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/payment-methods/${params.paymentMethodId}`);
  console.log(`PATCH`, url.href);

  const res = await fetch(url, {
    method: `PATCH`,
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

export async function DELETE(req: NextRequest, context: { params: Promise<{ paymentMethodId: string }> }) {
  const params = await context.params;
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/payment-methods/${params.paymentMethodId}`);
  console.log(`DELETE`, url.href);

  const res = await fetch(url, {
    method: `DELETE`,
    headers: new Headers(req.headers),
    credentials: `include`,
  });

  const cookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  const headers: HeadersInit = {};
  if (cookie) headers[`set-cookie`] = cookie;
  return new NextResponse(data, { status: res.status, headers });
}

export async function GET(req: NextRequest, context: { params: Promise<{ paymentMethodId: string }> }) {
  const params = await context.params;
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/payment-methods/${params.paymentMethodId}`);
  console.log(`GET`, url.href);

  const res = await fetch(url, {
    method: `GET`,
    headers: new Headers(req.headers),
    credentials: `include`,
    cache: `no-store`,
  });

  const cookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  const headers: HeadersInit = {};
  if (cookie) headers[`set-cookie`] = cookie;
  return new NextResponse(data, { status: res.status, headers });
}
