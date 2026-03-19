/**
 * Tests for shared redirect and login-param helpers.
 * Covers sanitizeNextForRedirect, removeStaleLoginParams, and cross-app equivalence.
 */

import { AUTH_NOTICE_QUERY } from './auth-notice';
import { removeStaleLoginParams, sanitizeNextForRedirect } from './safe-redirect';
import { SESSION_EXPIRED_QUERY } from './session-expired-query';

describe(`safe-redirect (api-types)`, () => {
  describe(`sanitizeNextForRedirect`, () => {
    const fallback = `/dashboard`;

    it(`returns fallback for empty or null`, () => {
      expect(sanitizeNextForRedirect(undefined, fallback)).toBe(fallback);
      expect(sanitizeNextForRedirect(null, fallback)).toBe(fallback);
      expect(sanitizeNextForRedirect(``, fallback)).toBe(fallback);
    });

    it(`returns fallback for protocol-relative`, () => {
      expect(sanitizeNextForRedirect(`//evil.com/path`, fallback)).toBe(fallback);
    });

    it(`returns fallback for external origin`, () => {
      expect(sanitizeNextForRedirect(`https://evil.com/path`, fallback)).toBe(fallback);
      expect(sanitizeNextForRedirect(`http://evil.com/path`, fallback)).toBe(fallback);
    });

    it(`returns fallback for malformed decode`, () => {
      expect(sanitizeNextForRedirect(`%`, fallback)).toBe(fallback);
      expect(sanitizeNextForRedirect(`%2`, fallback)).toBe(fallback);
    });

    it(`returns fallback for path not starting with /`, () => {
      expect(sanitizeNextForRedirect(`dashboard`, fallback)).toBe(fallback);
    });

    it(`returns safe internal path`, () => {
      expect(sanitizeNextForRedirect(`/settings`, fallback)).toBe(`/settings`);
      expect(sanitizeNextForRedirect(`/settings/foo`, fallback)).toBe(`/settings/foo`);
      expect(sanitizeNextForRedirect(encodeURIComponent(`/settings`), fallback)).toBe(`/settings`);
    });

    it(`returns fallback for /logout`, () => {
      expect(sanitizeNextForRedirect(`/logout`, fallback)).toBe(fallback);
      expect(sanitizeNextForRedirect(`/logout?x=1`, fallback)).toBe(fallback);
    });

    it(`returns fallback for newline/cr in path`, () => {
      expect(sanitizeNextForRedirect(`/path\n`, fallback)).toBe(fallback);
      expect(sanitizeNextForRedirect(`/path\r`, fallback)).toBe(fallback);
    });
  });

  describe(`removeStaleLoginParams`, () => {
    it(`removes given param keys`, () => {
      const url = new URL(`https://app.example.com/login?session_expired=1&next=%2F`);
      removeStaleLoginParams(url, [SESSION_EXPIRED_QUERY]);
      expect(url.searchParams.has(SESSION_EXPIRED_QUERY)).toBe(false);
      expect(url.searchParams.get(`next`)).toBe(`/`);
    });

    it(`removes multiple keys`, () => {
      const url = new URL(`https://app.example.com/login?session_expired=1&auth_notice=password_changed&next=%2F`);
      removeStaleLoginParams(url, [SESSION_EXPIRED_QUERY, AUTH_NOTICE_QUERY]);
      expect(url.searchParams.has(SESSION_EXPIRED_QUERY)).toBe(false);
      expect(url.searchParams.has(AUTH_NOTICE_QUERY)).toBe(false);
      expect(url.searchParams.get(`next`)).toBe(`/`);
    });

    it(`leaves other params intact`, () => {
      const url = new URL(`https://app.example.com/login?next=%2Fsettings&session_expired=1`);
      removeStaleLoginParams(url, [SESSION_EXPIRED_QUERY]);
      expect(url.searchParams.get(`next`)).toBe(`/settings`);
    });

    it(`is idempotent`, () => {
      const url = new URL(`https://app.example.com/login?session_expired=1`);
      removeStaleLoginParams(url, [SESSION_EXPIRED_QUERY]);
      removeStaleLoginParams(url, [SESSION_EXPIRED_QUERY]);
      expect(url.searchParams.has(SESSION_EXPIRED_QUERY)).toBe(false);
    });
  });

  describe(`cross-app equivalence`, () => {
    it(`sanitizeNextForRedirect: same inputs produce same outputs across apps`, () => {
      const fallback = `/dashboard`;
      expect(sanitizeNextForRedirect(`/settings`, fallback)).toBe(`/settings`);
      expect(sanitizeNextForRedirect(`/settings`, fallback)).toBe(sanitizeNextForRedirect(`/settings`, fallback));
      expect(sanitizeNextForRedirect(null, fallback)).toBe(fallback);
      expect(sanitizeNextForRedirect(`https://evil.com/p`, fallback)).toBe(fallback);
    });

    it(`removeStaleLoginParams: consumer/mobile params list produces
      same cleaned pathname+search as admin params list`, () => {
      const consumerParams = [SESSION_EXPIRED_QUERY, AUTH_NOTICE_QUERY];
      const adminParams = [SESSION_EXPIRED_QUERY];
      const url1 = new URL(`https://a.com/login?next=%2F&session_expired=1&auth_notice=reset_success`);
      const url2 = new URL(`https://a.com/login?next=%2F&session_expired=1&auth_notice=reset_success`);
      removeStaleLoginParams(url1, consumerParams);
      removeStaleLoginParams(url2, adminParams);
      expect(url1.pathname).toBe(url2.pathname);
      expect(url1.searchParams.has(AUTH_NOTICE_QUERY)).toBe(false);
      expect(url2.searchParams.has(AUTH_NOTICE_QUERY)).toBe(true);
      const pathSearch1 = url1.pathname + (url1.search ? url1.search : ``);
      const pathSearch2 = url2.pathname + (url2.search ? url2.search : ``);
      expect(pathSearch1).toBe(`/login?next=%2F`);
      expect(pathSearch2).toBe(`/login?next=%2F&auth_notice=reset_success`);
    });
  });
});
