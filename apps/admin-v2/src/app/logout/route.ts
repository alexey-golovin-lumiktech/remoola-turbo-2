import { NextResponse } from 'next/server';

import { appendSetCookies, buildAuthMutationForwardHeaders } from '../../lib/api-utils';
import { clearAdminAuthCookies, getCsrfTokenFromRequest } from '../../lib/auth-cookie-policy';
import { getEnv } from '../../lib/env.server';

const REDIRECT_STATUS_SEE_OTHER = 303;

export async function POST(request: Request) {
  const loginUrl = new URL(`/login`, request.url);
  const response = NextResponse.redirect(loginUrl, REDIRECT_STATUS_SEE_OTHER);
  const env = getEnv();
  const apiBase = env.NEXT_PUBLIC_API_BASE_URL;

  if (apiBase) {
    try {
      const csrfToken = getCsrfTokenFromRequest(request);
      const forwardHeaders = buildAuthMutationForwardHeaders(new Headers(request.headers));
      if (csrfToken) {
        forwardHeaders.set(`x-csrf-token`, csrfToken);
      }
      const backendResponse = await fetch(new URL(`${apiBase}/admin-v2/auth/logout`), {
        method: `POST`,
        headers: forwardHeaders,
        cache: `no-store`,
      });
      appendSetCookies(response.headers, backendResponse.headers);
      if (backendResponse.ok) {
        clearAdminAuthCookies(response, request);
        return response;
      }
    } catch {
      // Ignore upstream logout failures and still clear local cookies below.
    }
  }

  clearAdminAuthCookies(response, request);
  return response;
}
