import { NextResponse } from 'next/server';

import { AUTH_NOTICE_QUERY, parseAuthNotice } from '@remoola/api-types';

import { appendSetCookies, buildAuthMutationForwardHeaders } from '../../lib/api-utils';
import { clearConsumerAuthCookies, getCsrfTokenFromRequest } from '../../lib/auth-cookie-policy';
import { getEnv } from '../../lib/env.server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { origin } = requestUrl;
  const authNotice = parseAuthNotice(requestUrl.searchParams.get(AUTH_NOTICE_QUERY) ?? undefined);
  const loginUrl = new URL(`/login`, origin);
  if (authNotice) {
    loginUrl.searchParams.set(AUTH_NOTICE_QUERY, authNotice);
  }

  const env = getEnv();
  const apiBase = env.NEXT_PUBLIC_API_BASE_URL;
  const response = NextResponse.redirect(loginUrl);

  if (apiBase) {
    try {
      const csrfToken = getCsrfTokenFromRequest(request);
      const forwardHeaders = buildAuthMutationForwardHeaders(new Headers(request.headers));
      if (csrfToken) {
        forwardHeaders.set(`x-csrf-token`, csrfToken);
      }
      const backendResponse = await fetch(new URL(`${apiBase}/consumer/auth/logout`), {
        method: `POST`,
        headers: forwardHeaders,
        credentials: `include`,
        cache: `no-store`,
      });
      appendSetCookies(response.headers, backendResponse.headers);
      if (backendResponse.ok) {
        clearConsumerAuthCookies(response, request);
        return response;
      }
    } catch {
      // Fall back to local cookie cleanup when backend logout is unavailable.
    }
  }

  clearConsumerAuthCookies(response, request);
  return response;
}
