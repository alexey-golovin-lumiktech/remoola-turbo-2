import { type NextRequest, NextResponse } from 'next/server';

import { SESSION_EXPIRED_QUERY, sanitizeNextForRedirect } from '@remoola/api-types';

import { clearConsumerAuthCookies } from '../auth-cookie-policy';

export type MiddlewareRequestKind = `callback` | `logout_route` | `auth_page` | `protected_page`;

export interface MiddlewareRequestPolicy {
  kind: MiddlewareRequestKind;
  currentPathWithSearch: string;
  isServerActionRequest: boolean;
}

function isAuthPage(pathname: string): boolean {
  return pathname.startsWith(`/login`) || pathname.startsWith(`/forgot-password`) || pathname.startsWith(`/signup`);
}

function isCallback(pathname: string): boolean {
  return pathname.startsWith(`/auth/callback`);
}

function isLogoutRoute(pathname: string): boolean {
  return pathname.startsWith(`/logout`);
}

export function classifyMiddlewareRequest(req: NextRequest): MiddlewareRequestPolicy {
  const { pathname, search } = req.nextUrl;

  let kind: MiddlewareRequestKind = `protected_page`;
  if (isCallback(pathname)) {
    kind = `callback`;
  } else if (isLogoutRoute(pathname)) {
    kind = `logout_route`;
  } else if (isAuthPage(pathname)) {
    kind = `auth_page`;
  }

  return {
    kind,
    currentPathWithSearch: pathname + search,
    isServerActionRequest: req.method === `POST` && req.headers.has(`next-action`),
  };
}

function encodeSafeNext(path: string): string {
  return encodeURIComponent(sanitizeNextForRedirect(path, `/dashboard`));
}

export function createLoginRedirect(
  req: NextRequest,
  policy: MiddlewareRequestPolicy,
  options?: { sessionExpired?: boolean },
): NextResponse {
  const loginUrl = new URL(`/login?next=${encodeSafeNext(policy.currentPathWithSearch)}`, req.url);
  if (options?.sessionExpired) {
    loginUrl.searchParams.set(SESSION_EXPIRED_QUERY, `1`);
  }

  const response = NextResponse.redirect(loginUrl);
  if (options?.sessionExpired) {
    clearConsumerAuthCookies(response, req);
  }
  return response;
}

export function createDashboardRedirect(req: NextRequest): NextResponse {
  return NextResponse.redirect(new URL(`/dashboard`, req.url));
}

export function createProtectedActionFailureResponse(
  req: NextRequest,
  policy: MiddlewareRequestPolicy,
  options?: { sessionExpired?: boolean },
): NextResponse {
  if (policy.isServerActionRequest) {
    return NextResponse.next();
  }
  return createLoginRedirect(req, policy, options);
}

export function continueWithRequestHeaders(headers?: Headers): NextResponse {
  return headers ? NextResponse.next({ request: { headers } }) : NextResponse.next();
}

export function clearAuthCookiesAndContinue(req: NextRequest): NextResponse {
  const response = NextResponse.next();
  clearConsumerAuthCookies(response, req);
  return response;
}
