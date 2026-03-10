import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies } from '../../../../../lib/api-utils';
import { getCsrfTokenFromRequest } from '../../../../../lib/auth-cookie-policy';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * BFF: forwards cookies to backend and forwards backend Set-Cookie unchanged
 * (access, refresh, csrf) so token rotation works. See auth-cookie-policy rule.
 */
export async function POST(req: NextRequest) {
  if (!API_BASE) {
    return NextResponse.json({ message: `Server configuration error` }, { status: 500 });
  }

  try {
    const csrfToken = getCsrfTokenFromRequest(req);
    const forwardHeaders = new Headers(req.headers);
    forwardHeaders.delete(`host`);
    if (csrfToken) forwardHeaders.set(`x-csrf-token`, csrfToken);

    const url = new URL(`${API_BASE}/consumer/auth/refresh`);
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
