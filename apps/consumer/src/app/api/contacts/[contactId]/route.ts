import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
export async function PATCH(req: NextRequest, context: { params: Promise<{ contactId: string }> }) {
  const params = await context.params;
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/contacts/${params.contactId}`;
  console.log(`PATCH`, url);

  const res = await fetch(url, {
    method: `PATCH`,
    headers: {

      'Content-Type': `application/json`,
      Cookie: (await cookies()).toString(),
    },
    credentials: `include`,
    body: await req.clone().text(),
  });

  const setCookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  return new NextResponse(data, { status: res.status, headers: setCookie ? { 'set-cookie': setCookie } : {} });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ contactId: string }> }) {
  const params = await context.params;
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/contacts/${params.contactId}`;
  console.log(`DELETE`, url);

  const res = await fetch(url, {
    method: `DELETE`,
    headers: {

      'Content-Type': `application/json`,
      Cookie: (await cookies()).toString(),
      referrer: `http://127.0.0.1:3001`,
    },
    credentials: `include`,
  });

  const setCookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  return new NextResponse(data, { status: res.status, headers: setCookie ? { 'set-cookie': setCookie } : {} });
}
