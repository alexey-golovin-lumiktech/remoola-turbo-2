import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { getAdminCsrfCookieKey } from './auth-cookie-policy';
import {
  handleSessionExpired,
  isRedirectInProgress,
  resetSessionExpiredHandled,
  SESSION_EXPIRED_QUERY,
} from './session-expired';

jest.mock(`sonner`, () => ({ toast: { error: jest.fn() } }));

describe(`session-expired (admin)`, () => {
  const originalFetch = global.fetch;
  const originalDocument = global.document;
  let mockReplace: ReturnType<typeof jest.fn>;

  beforeEach(() => {
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 })) as typeof fetch;
    mockReplace = jest.fn();
    (
      globalThis as unknown as {
        window?: { location: { replace: typeof mockReplace; pathname: string; search: string } };
      }
    ).window = {
      location: { replace: mockReplace, pathname: `/dashboard`, search: `` },
    };
    Object.defineProperty(global, `document`, {
      value: { cookie: `${getAdminCsrfCookieKey()}=csrf-123; other=value` },
      configurable: true,
      writable: true,
    });
    resetSessionExpiredHandled();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.document = originalDocument;
    delete (globalThis as { window?: unknown }).window;
  });

  it(`redirects once when handleSessionExpired is called twice (concurrent 401 one-handoff)`, async () => {
    handleSessionExpired();
    handleSessionExpired();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(mockReplace).toHaveBeenCalledTimes(1);
    const redirectUrl = mockReplace.mock.calls[0]?.[0] as string;
    expect(redirectUrl).toContain(`/login?next=`);
    expect(redirectUrl).toContain(`${SESSION_EXPIRED_QUERY}=1`);
  });

  it(`sends x-csrf-token when clearing cookies via logout API`, async () => {
    handleSessionExpired();
    await new Promise((r) => setTimeout(r, 0));

    expect(global.fetch).toHaveBeenCalledWith(
      `/api/auth/logout`,
      expect.objectContaining({
        method: `POST`,
        credentials: `include`,
        headers: expect.any(Headers),
      }),
    );
    const requestInit = (((global.fetch as unknown as jest.Mock).mock.calls[0] ?? [])[1] ?? {}) as RequestInit & {
      headers?: Headers;
    };
    const headers = requestInit.headers as Headers;
    expect(headers.get(`x-csrf-token`)).toBe(`csrf-123`);
  });

  it(`exposes SESSION_EXPIRED_QUERY`, () => {
    expect(SESSION_EXPIRED_QUERY).toBe(`session_expired`);
  });

  it(`resetSessionExpiredHandled allows redirect on next call`, async () => {
    handleSessionExpired();
    await new Promise((r) => setTimeout(r, 0));
    expect(mockReplace).toHaveBeenCalledTimes(1);
    mockReplace.mockClear();
    resetSessionExpiredHandled();
    handleSessionExpired();
    await new Promise((r) => setTimeout(r, 0));
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it(`isRedirectInProgress is false before any call`, () => {
    expect(isRedirectInProgress()).toBe(false);
  });

  it(`isRedirectInProgress is true after handleSessionExpired`, async () => {
    handleSessionExpired();
    expect(isRedirectInProgress()).toBe(true);
    await new Promise((r) => setTimeout(r, 0));
    expect(isRedirectInProgress()).toBe(true);
  });

  it(`isRedirectInProgress is false after resetSessionExpiredHandled`, () => {
    handleSessionExpired();
    expect(isRedirectInProgress()).toBe(true);
    resetSessionExpiredHandled();
    expect(isRedirectInProgress()).toBe(false);
  });

  it(`one-shot redirect sets redirect-in-progress guard`, async () => {
    handleSessionExpired();
    handleSessionExpired();
    expect(isRedirectInProgress()).toBe(true);
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });
});
