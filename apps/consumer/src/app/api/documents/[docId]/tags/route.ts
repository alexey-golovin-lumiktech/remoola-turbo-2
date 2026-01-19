import { NextResponse, type NextRequest } from 'next/server';

export async function POST(req: NextRequest, context: { params: Promise<{ docId: string }> }) {
  const params = await context.params;
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/consumer/documents/${params.docId}/tags`);
  console.log(`POST`, url.href);

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
