import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest, context: { params: Promise<{ paymentMethodId: string }> }) {
  const params = await context.params;
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/payment-methods/${params.paymentMethodId}`;
  console.log(`PATCH`, url);

  const res = await fetch(url, {
    method: `PATCH`,
    headers: {
      ...Object.fromEntries(req.headers),
      'Content-Type': `application/json`,
      Cookie: (await cookies()).toString(),
      referrer: `http://127.0.0.1:3001`,
    },
    credentials: `include`,
    cache: `no-cache`,
    body: await req.text(),
  });

  const setCookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  return new NextResponse(data, { status: res.status, headers: setCookie ? { 'set-cookie': setCookie } : {} });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ paymentMethodId: string }> }) {
  const params = await context.params;
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/payment-methods/${params.paymentMethodId}`;
  console.log(`DELETE`, url);

  const res = await fetch(url, {
    method: `DELETE`,
    headers: {
      ...Object.fromEntries(req.headers),
      'Content-Type': `application/json`,
      Cookie: (await cookies()).toString(),
      referrer: `http://127.0.0.1:3001`,
    },
    credentials: `include`,
    cache: `no-cache`,
  });

  const setCookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  return new NextResponse(data, { status: res.status, headers: setCookie ? { 'set-cookie': setCookie } : {} });
}
