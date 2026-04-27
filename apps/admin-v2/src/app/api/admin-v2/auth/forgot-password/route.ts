import { NextResponse } from 'next/server';

import { forgotPasswordSchema } from '../../../../../features/auth/schemas';
import { buildAuthMutationForwardHeaders } from '../../../../../lib/api-utils';
import { getEnv } from '../../../../../lib/env.server';

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
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: `VALIDATION_ERROR`,
        message: `Invalid forgot-password payload`,
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const forwardHeaders = buildAuthMutationForwardHeaders(new Headers(req.headers));
  forwardHeaders.set(`content-type`, `application/json`);

  const res = await fetch(new URL(`${baseUrl}/admin-v2/auth/forgot-password`), {
    method: `POST`,
    headers: forwardHeaders,
    body: JSON.stringify(parsed.data),
    cache: `no-store`,
  });

  return new NextResponse(await res.text(), { status: res.status });
}
