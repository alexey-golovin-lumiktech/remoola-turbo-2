/**
 * Tests for login-page stale query-flag cleanup (session_expired, auth_notice removed after first render).
 * Logic under test mirrors the cleanup in LoginForm useEffect.
 */
import { AUTH_NOTICE_QUERY, removeStaleLoginParams, SESSION_EXPIRED_QUERY } from '@remoola/api-types';

/** Mirrors LoginForm cleanup: build pathname + search with session_expired and auth_notice removed. */
function getCleanedLoginPathSearch(href: string): string {
  const url = new URL(href);
  removeStaleLoginParams(url, [SESSION_EXPIRED_QUERY, AUTH_NOTICE_QUERY]);
  return url.pathname + (url.search || ``);
}

describe(`clean-login-query (consumer)`, () => {
  it(`removes session_expired from URL after first consumption`, () => {
    const href = `https://app.example.com/login?next=%2Fdashboard&session_expired=1`;
    expect(getCleanedLoginPathSearch(href)).toBe(`/login?next=%2Fdashboard`);
    expect(getCleanedLoginPathSearch(href)).not.toContain(SESSION_EXPIRED_QUERY);
  });

  it(`removes auth_notice from URL after first consumption`, () => {
    const href = `https://app.example.com/login?auth_notice=password_changed`;
    expect(getCleanedLoginPathSearch(href)).toBe(`/login`);
    expect(getCleanedLoginPathSearch(href)).not.toContain(AUTH_NOTICE_QUERY);
  });

  it(`removes both session_expired and auth_notice`, () => {
    const href = `https://app.example.com/login?session_expired=1&auth_notice=reset_success&next=%2F`;
    const cleaned = getCleanedLoginPathSearch(href);
    expect(cleaned).toBe(`/login?next=%2F`);
    expect(cleaned).not.toContain(SESSION_EXPIRED_QUERY);
    expect(cleaned).not.toContain(AUTH_NOTICE_QUERY);
  });

  it(`leaves other params intact`, () => {
    const href = `https://app.example.com/login?next=%2Fsettings&session_expired=1`;
    expect(getCleanedLoginPathSearch(href)).toBe(`/login?next=%2Fsettings`);
  });
});
