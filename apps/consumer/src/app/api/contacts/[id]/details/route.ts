import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const cookieHeader = (await cookies()).toString();
  const base = process.env.NEXT_PUBLIC_API_BASE_URL!;

  const entries = Object.fromEntries(req.headers);
  const headers: Record<string, string> = {
    'Content-Type': `application/json`,
    Cookie: cookieHeader,
    ...(entries.authorization?.trim() && { authorization: entries.authorization }),
  };
  const res = await fetch(`${base}/contacts/${params.id}/details`, {
    headers: headers,
    credentials: `include`,
  });

  return new NextResponse(await res.text(), { status: res.status });
}
