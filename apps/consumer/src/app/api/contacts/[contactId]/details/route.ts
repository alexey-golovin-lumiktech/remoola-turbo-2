import { type NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, context: { params: Promise<{ contactId: string }> }) {
  const params = await context.params;
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/contacts/${params.contactId}/details`;
  console.log(`GET`, url);

  const res = await fetch(url, {
    method: `GET`,
    headers: { ...Object.fromEntries(req.headers), 'content-type': `application/json` },
    credentials: `include`,
    cache: `no-store`,
  });

  const cookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  const headers: HeadersInit = {};
  if (cookie) headers[`set-cookie`] = cookie;
  return new NextResponse(data, { status: res.status, headers });
}
