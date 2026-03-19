import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  handleSessionExpired,
  isRedirectInProgress,
  resetSessionExpiredHandled,
  SESSION_EXPIRED_QUERY,
} from './session-expired';

describe(`session-expired (consumer-mobile)`, () => {
  let replaceCallCount: number;
  let lastReplaceUrl: string | undefined;
  let fakeLocation: { pathname: string; search: string; replace: (url: string) => void };
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    replaceCallCount = 0;
    lastReplaceUrl = undefined;
    fetchMock = jest.fn(() => Promise.resolve({ ok: true } as Response)) as jest.MockedFunction<typeof fetch>;
    (globalThis as { fetch?: unknown }).fetch = fetchMock;

    fakeLocation = {
      pathname: `/dashboard`,
      search: ``,
      replace: (url: string) => {
        replaceCallCount++;
        lastReplaceUrl = url;
      },
    };
    (globalThis as { window?: { location: typeof fakeLocation } }).window = {
      location: fakeLocation,
    };
    resetSessionExpiredHandled();
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { fetch?: unknown }).fetch;
  });

  it(`calls clear-cookies endpoint before redirecting`, async () => {
    handleSessionExpired();
    // Wait for fetch promise chain to resolve
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).toHaveBeenCalledWith(`/api/consumer/auth/clear-cookies`, {
      method: `POST`,
      credentials: `include`,
    });
    expect(replaceCallCount).toBe(1);
  });

  it(`redirects once when handleSessionExpired is called twice (concurrent 401 one-handoff)`, async () => {
    handleSessionExpired();
    handleSessionExpired();
    await new Promise((r) => setTimeout(r, 0));
    expect(replaceCallCount).toBe(1);
    expect(lastReplaceUrl).toContain(`/login?session_expired=1`);
    expect(lastReplaceUrl).toContain(`next=`);
  });

  it(`exposes SESSION_EXPIRED_QUERY`, () => {
    expect(SESSION_EXPIRED_QUERY).toBe(`session_expired`);
  });

  it(`resetSessionExpiredHandled allows redirect on next call`, async () => {
    handleSessionExpired();
    await new Promise((r) => setTimeout(r, 0));
    expect(replaceCallCount).toBe(1);
    resetSessionExpiredHandled();
    handleSessionExpired();
    await new Promise((r) => setTimeout(r, 0));
    expect(replaceCallCount).toBe(2);
  });

  it(`no-ops when already on login path`, async () => {
    fakeLocation.pathname = `/login`;
    handleSessionExpired();
    handleSessionExpired();
    await new Promise((r) => setTimeout(r, 0));
    expect(replaceCallCount).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it(`no-ops when on /auth/ OAuth callback path`, async () => {
    fakeLocation.pathname = `/auth/callback`;
    handleSessionExpired();
    await new Promise((r) => setTimeout(r, 0));
    expect(replaceCallCount).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it(`isRedirectInProgress is false before any call`, () => {
    expect(isRedirectInProgress()).toBe(false);
  });

  it(`isRedirectInProgress is true after handleSessionExpired`, () => {
    handleSessionExpired();
    expect(isRedirectInProgress()).toBe(true);
  });

  it(`isRedirectInProgress is false after resetSessionExpiredHandled`, async () => {
    handleSessionExpired();
    await new Promise((r) => setTimeout(r, 0));
    expect(isRedirectInProgress()).toBe(true);
    resetSessionExpiredHandled();
    expect(isRedirectInProgress()).toBe(false);
  });

  it(`one-shot redirect sets redirect-in-progress guard`, async () => {
    handleSessionExpired();
    handleSessionExpired();
    expect(isRedirectInProgress()).toBe(true);
    await new Promise((r) => setTimeout(r, 0));
    expect(replaceCallCount).toBe(1);
  });

  it(`still redirects if clear-cookies fetch fails`, async () => {
    fetchMock.mockRejectedValueOnce(new Error(`network`)).mockResolvedValueOnce({ ok: true } as Response);
    handleSessionExpired();
    await new Promise((r) => setTimeout(r, 10));
    expect(replaceCallCount).toBe(1);
    expect(lastReplaceUrl).toContain(`session_expired=1`);
  });
});
