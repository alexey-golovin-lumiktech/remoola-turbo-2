import { NextResponse } from 'next/server';

import { AUTH_NOTICE_QUERY } from '@remoola/api-types';

import { appendSetCookies, buildAuthMutationForwardHeaders } from '../../lib/api-utils';
import { clearConsumerAuthCookies, getCsrfTokenFromRequest } from '../../lib/auth-cookie-policy';
import { getEnv } from '../../lib/env.server';

const LOGOUT_ALL_FAILED_QUERY = `logout_all_failed`;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { origin } = requestUrl;
  const loginUrl = new URL(`/login`, origin);
  loginUrl.searchParams.set(AUTH_NOTICE_QUERY, `signed_out_all_sessions`);
  const settingsUrl = new URL(`/settings`, origin);
  settingsUrl.searchParams.set(LOGOUT_ALL_FAILED_QUERY, `1`);

  const env = getEnv();
  const apiBase = env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBase) {
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const csrfToken = getCsrfTokenFromRequest(request);
    const forwardHeaders = buildAuthMutationForwardHeaders(new Headers(request.headers));
    if (csrfToken) {
      forwardHeaders.set(`x-csrf-token`, csrfToken);
    }
    const backendResponse = await fetch(new URL(`${apiBase}/consumer/auth/logout-all`), {
      method: `POST`,
      headers: forwardHeaders,
      credentials: `include`,
      cache: `no-store`,
    });

    if (!backendResponse.ok) {
      return NextResponse.redirect(settingsUrl);
    }

    const response = NextResponse.redirect(loginUrl);
    appendSetCookies(response.headers, backendResponse.headers);
    clearConsumerAuthCookies(response, request);
    return response;
  } catch {
    return NextResponse.redirect(settingsUrl);
  }
}
