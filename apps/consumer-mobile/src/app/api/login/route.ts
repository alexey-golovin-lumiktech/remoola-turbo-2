import { NextResponse } from 'next/server';

import { loginSchema } from '../../../features/auth/schemas';
import { getEnv } from '../../../lib/env.server';

export async function POST(req: Request) {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }

  const raw = await req
    .clone()
    .json()
    .catch(() => null);
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { code: `VALIDATION_ERROR`, message: `Invalid login payload`, fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const url = new URL(`${baseUrl}/consumer/auth/login`);
  const res = await fetch(url, {
    method: `POST`,
    headers: { ...Object.fromEntries(new Headers(req.headers)), 'content-type': `application/json` },
    credentials: `include`,
    body: JSON.stringify(parsed.data),
    cache: `no-store`,
  });

  const cookie = res.headers.get(`set-cookie`);
  const data = await res.text();
  const headers: HeadersInit = {};
  if (cookie) headers[`set-cookie`] = cookie;
  return new NextResponse(data, { status: res.status, headers });
}
