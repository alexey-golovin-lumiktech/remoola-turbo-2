import { NextResponse } from 'next/server';

import { appendSetCookies } from '../../lib/api-utils';
import { clearConsumerAuthCookies, getCsrfTokenFromRequest } from '../../lib/auth-cookie-policy';
import { getEnv } from '../../lib/env.server';

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const env = getEnv();
  const apiBase = env.NEXT_PUBLIC_API_BASE_URL;
  const response = NextResponse.redirect(`${origin}/login`);

  if (apiBase) {
    try {
      const csrfToken = getCsrfTokenFromRequest(request);
      const backendResponse = await fetch(new URL(`${apiBase}/consumer/auth/logout`), {
        method: `POST`,
        headers: {
          ...Object.fromEntries(new Headers(request.headers)),
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        credentials: `include`,
        cache: `no-store`,
      });
      appendSetCookies(response.headers, backendResponse.headers);
      return response;
    } catch {
      // continue with client-side cookie cleanup
    }
  }

  clearConsumerAuthCookies(response, request);
  return response;
}
