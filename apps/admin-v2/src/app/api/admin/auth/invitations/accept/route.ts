import { NextResponse } from 'next/server';

import { buildAuthMutationForwardHeaders, requireJsonBody } from '../../../../../../lib/api-utils';
import { getEnv } from '../../../../../../lib/env.server';

export async function POST(req: Request) {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }

  const parsed = await requireJsonBody(req);
  if (!parsed.ok) {
    return parsed.response;
  }

  const forwardHeaders = buildAuthMutationForwardHeaders(new Headers(req.headers));
  forwardHeaders.set(`content-type`, `application/json`);

  const res = await fetch(new URL(`${baseUrl}/admin-v2/auth/invitations/accept`), {
    method: `POST`,
    headers: forwardHeaders,
    body: parsed.body,
    cache: `no-store`,
  });

  return new NextResponse(await res.text(), { status: res.status });
}
