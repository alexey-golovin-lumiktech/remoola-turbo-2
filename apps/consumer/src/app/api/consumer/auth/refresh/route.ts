import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies, buildAuthMutationForwardHeaders } from '../../../../../lib/api-utils';
import { getCsrfTokenFromRequest } from '../../../../../lib/auth-cookie-policy';

/**
 * BFF: forwards cookies to backend and forwards backend Set-Cookie unchanged
 * (access, refresh, csrf) so token rotation works. See auth-cookie-policy rule.
 */
export async function POST(req: NextRequest) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBase) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }

  try {
    const csrfToken = getCsrfTokenFromRequest(req);
    const forwardHeaders = buildAuthMutationForwardHeaders(req.headers);
    if (csrfToken) forwardHeaders.set(`x-csrf-token`, csrfToken);

    const url = new URL(`${apiBase}/consumer/auth/refresh`);
    const res = await fetch(url, {
      method: `POST`,
      headers: forwardHeaders,
      cache: `no-store`,
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.text();
    const responseHeaders = new Headers();
    appendSetCookies(responseHeaders, res.headers);
    return new NextResponse(data, { status: res.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ message: `Refresh failed` }, { status: 503 });
  }
}
