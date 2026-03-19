/**
 * Tests for admin login-page stale query-flag cleanup (session_expired removed after first render).
 * Logic under test mirrors the cleanup in LoginPageClient useEffect.
 */
import { removeStaleLoginParams, SESSION_EXPIRED_QUERY } from '@remoola/api-types';

/** Mirrors LoginPageClient cleanup: build pathname + search with session_expired removed. */
function getCleanedLoginPathSearch(href: string): string {
  const url = new URL(href);
  removeStaleLoginParams(url, [SESSION_EXPIRED_QUERY]);
  return url.pathname + (url.search || ``);
}

describe(`clean-login-query (admin)`, () => {
  it(`removes session_expired from URL after first consumption`, () => {
    const href = `https://admin.example.com/login?next=%2Fdashboard&session_expired=1`;
    expect(getCleanedLoginPathSearch(href)).toBe(`/login?next=%2Fdashboard`);
    expect(getCleanedLoginPathSearch(href)).not.toContain(SESSION_EXPIRED_QUERY);
  });

  it(`leaves next param intact`, () => {
    const href = `https://admin.example.com/login?next=%2Fsettings&session_expired=1`;
    expect(getCleanedLoginPathSearch(href)).toBe(`/login?next=%2Fsettings`);
  });
});
