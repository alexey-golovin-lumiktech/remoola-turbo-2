import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const cookieHeader = (await cookies()).toString();
  const base = process.env.NEXT_PUBLIC_API_BASE_URL!;

  const entries = Object.fromEntries(req.headers);
  const headers: Record<string, string> = {
    'Content-Type': `application/json`,
    Cookie: cookieHeader,
    ...(entries.authorization?.trim() && { authorization: entries.authorization }),
  };

  const body = await req.text();

  const res = await fetch(`${base}/contacts/${params.id}`, {
    method: `PATCH`,
    headers: headers,
    credentials: `include`,
    body,
  });

  return new NextResponse(await res.text(), { status: res.status });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const cookieHeader = (await cookies()).toString();
  const base = process.env.NEXT_PUBLIC_API_BASE_URL!;

  const entries = Object.fromEntries(req.headers);
  const headers: Record<string, string> = {
    'Content-Type': `application/json`,
    Cookie: cookieHeader,
    ...(entries.authorization?.trim() && { authorization: entries.authorization }),
  };

  const res = await fetch(`${base}/contacts/${params.id}`, {
    method: `DELETE`,
    headers: headers,
    credentials: `include`,
  });

  return new NextResponse(await res.text(), { status: res.status });
}
