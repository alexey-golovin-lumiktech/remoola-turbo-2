import { NextResponse } from 'next/server';

import { AUTH_NOTICE_QUERY, parseAuthNotice } from '@remoola/api-types';

import { appendSetCookies, buildAuthMutationForwardHeaders } from '../../lib/api-utils';
import { clearConsumerAuthCookies, getCsrfTokenFromRequest } from '../../lib/auth-cookie-policy';
import { getEnv } from '../../lib/env.server';

const REDIRECT_STATUS_SEE_OTHER = 303;

function buildLogoutUrls(request: Request) {
  const requestUrl = new URL(request.url);
  const { origin } = requestUrl;
  const authNotice = parseAuthNotice(requestUrl.searchParams.get(AUTH_NOTICE_QUERY) ?? undefined);
  const loginUrl = new URL(`/login`, origin);
  if (authNotice) {
    loginUrl.searchParams.set(AUTH_NOTICE_QUERY, authNotice);
  }
  return { loginUrl };
}

export async function POST(request: Request) {
  const { loginUrl } = buildLogoutUrls(request);

  const env = getEnv();
  const apiBase = env.NEXT_PUBLIC_API_BASE_URL;
  const response = NextResponse.redirect(loginUrl, REDIRECT_STATUS_SEE_OTHER);

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
      // Ignore upstream logout failures and still clear local cookies below.
    }
  }

  clearConsumerAuthCookies(response, request);
  return response;
}
