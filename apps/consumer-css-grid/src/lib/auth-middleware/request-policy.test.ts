import { describe, expect, it } from '@jest/globals';
import { NextRequest } from 'next/server';

import { classifyMiddlewareRequest, createLoginRedirect, createProtectedActionFailureResponse } from './request-policy';

function createRequest(
  pathname: string,
  init?: { method?: string; headers?: Record<string, string>; origin?: string },
) {
  return new NextRequest(`${init?.origin ?? `https://example.com`}${pathname}`, {
    method: init?.method,
    headers: init?.headers,
  });
}

describe(`auth middleware request policy`, () => {
  it(`classifies callback, logout, auth, and protected routes`, () => {
    expect(classifyMiddlewareRequest(createRequest(`/auth/callback`)).kind).toBe(`callback`);
    expect(classifyMiddlewareRequest(createRequest(`/logout-all`)).kind).toBe(`logout_route`);
    expect(classifyMiddlewareRequest(createRequest(`/login`)).kind).toBe(`auth_page`);
    expect(classifyMiddlewareRequest(createRequest(`/settings`)).kind).toBe(`protected_page`);
  });

  it(`preserves the full current query string in login redirects`, () => {
    const request = createRequest(`/payments?role=PAYER&status=PENDING`);
    const policy = classifyMiddlewareRequest(request);
    const response = createLoginRedirect(request, policy);

    expect(response.headers.get(`location`)).toContain(`/login?next=%2Fpayments%3Frole%3DPAYER%26status%3DPENDING`);
  });

  it(`keeps protected server action failures non-redirecting`, () => {
    const request = createRequest(`/settings`, {
      method: `POST`,
      headers: { 'next-action': `action-id` },
    });
    const policy = classifyMiddlewareRequest(request);
    const response = createProtectedActionFailureResponse(request, policy, { sessionExpired: true });

    expect(response.status).toBe(200);
    expect(response.headers.get(`location`)).toBeNull();
  });
});
