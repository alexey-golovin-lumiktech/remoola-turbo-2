import { NextResponse } from 'next/server';

import { appendSetCookies } from '../../../../../lib/api-utils';
import { getCsrfTokenFromRequest } from '../../../../../lib/auth-cookie-policy';
import { getEnv } from '../../../../../lib/env.server';
import { serverLogger } from '../../../../../lib/logger.server';

/**
 * BFF: forwards cookies and CSRF to backend; forwards backend Set-Cookie unchanged
 * (access, refresh, csrf) so token rotation works. See auth-cookie-policy rule.
 */
export async function POST(req: Request) {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }

  try {
    const csrfToken = getCsrfTokenFromRequest(req);
    const forwardHeaders = new Headers(req.headers);
    forwardHeaders.delete(`host`);
    if (csrfToken) forwardHeaders.set(`x-csrf-token`, csrfToken);

    const url = new URL(`${baseUrl}/consumer/auth/refresh`);
    const res = await fetch(url, {
      method: `POST`,
      headers: forwardHeaders,
      cache: `no-store`,
    });

    const data = await res.text();
    const responseHeaders = new Headers();
    appendSetCookies(responseHeaders, res.headers);

    return new NextResponse(data, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (error) {
    serverLogger.error(`Auth refresh failed`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        code: `REFRESH_FAILED`,
        message: `Failed to refresh authentication token`,
      },
      { status: 500 },
    );
  }
}
