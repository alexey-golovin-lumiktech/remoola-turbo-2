import { type NextRequest, NextResponse } from 'next/server';

import { appendSetCookies } from './lib/api-utils';
import { clearAdminAuthCookies, getPreferredAdminCookieValue } from './lib/auth-cookie-policy';
import { mergeSetCookieHeadersIntoHeader } from './lib/cookies';
import { isAuthPagePath, isLogoutPath } from './lib/middleware-auth/paths';
import { probeAccessSession, refreshAccess } from './lib/middleware-auth/refresh';
import { applyRefreshTelemetry } from './lib/middleware-auth/telemetry';
import { hasPotentialAccessToken, isObviouslyInvalidCookieToken } from './lib/middleware-auth/token-shape';

export async function middleware(req: NextRequest) {
  const accessToken = getPreferredAdminCookieValue(req, `access`);
  const refreshToken = getPreferredAdminCookieValue(req, `refresh`);
  const csrfToken = getPreferredAdminCookieValue(req, `csrf`);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(`x-pathname`, req.nextUrl.pathname);

  const isAuthPage = isAuthPagePath(req.nextUrl.pathname);
  const isLogoutRoute = isLogoutPath(req.nextUrl.pathname);
  const isProtected = !isAuthPage && !isLogoutRoute;
  const hasValidAccessTokenShape = !isObviouslyInvalidCookieToken(accessToken);
  const hasValidRefreshTokenShape = !isObviouslyInvalidCookieToken(refreshToken);

  if (isAuthPage && hasValidAccessTokenShape && accessToken && hasPotentialAccessToken(accessToken)) {
    const probeResponse = await probeAccessSession(req, accessToken);
    if (probeResponse?.ok) {
      return NextResponse.redirect(new URL(`/overview`, req.url));
    }
  }

  const loginRedirect = () => {
    const response = NextResponse.redirect(new URL(`/login`, req.url));
    clearAdminAuthCookies(response, req);
    return response;
  };

  if (isProtected && !hasValidAccessTokenShape) {
    if (hasValidRefreshTokenShape && refreshToken) {
      const refreshResult = await refreshAccess(req, refreshToken, csrfToken, `protected_page`);
      const refreshResponse = refreshResult.response;
      if (refreshResponse) {
        requestHeaders.set(
          `cookie`,
          mergeSetCookieHeadersIntoHeader(req.headers.get(`cookie`), refreshResponse.headers),
        );
        const response = NextResponse.next({ request: { headers: requestHeaders } });
        appendSetCookies(response.headers, refreshResponse.headers);
        return applyRefreshTelemetry(response, refreshResult.telemetry);
      }
      return applyRefreshTelemetry(loginRedirect(), refreshResult.telemetry);
    }
    return loginRedirect();
  }

  if (isProtected && hasValidAccessTokenShape && accessToken) {
    if (hasPotentialAccessToken(accessToken)) {
      const probeResponse = await probeAccessSession(req, accessToken);
      if (probeResponse?.ok) {
        return NextResponse.next({ request: { headers: requestHeaders } });
      }
    }
    if (hasValidRefreshTokenShape && refreshToken) {
      const refreshResult = await refreshAccess(req, refreshToken, csrfToken, `protected_page`);
      const refreshResponse = refreshResult.response;
      if (refreshResponse) {
        requestHeaders.set(
          `cookie`,
          mergeSetCookieHeadersIntoHeader(req.headers.get(`cookie`), refreshResponse.headers),
        );
        const response = NextResponse.next({ request: { headers: requestHeaders } });
        appendSetCookies(response.headers, refreshResponse.headers);
        return applyRefreshTelemetry(response, refreshResult.telemetry);
      }
      return applyRefreshTelemetry(loginRedirect(), refreshResult.telemetry);
    }
    return loginRedirect();
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: [`/((?!_next|favicon.ico|assets|api/.*).*)`] };
