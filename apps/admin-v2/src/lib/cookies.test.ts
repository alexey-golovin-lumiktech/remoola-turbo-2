import { describe, expect, it } from '@jest/globals';

import {
  getCookieValue,
  getPreferredCookieValue,
  mergeSetCookieHeadersIntoHeader,
  mergeSetCookieValuesIntoHeader,
  parseCookieHeader,
} from './cookies';

describe(`cookie helpers`, () => {
  it(`parses cookie headers and preserves values containing equals signs`, () => {
    expect(parseCookieHeader(`admin_csrf_token=csrf=token; theme=light`)).toEqual(
      new Map([
        [`admin_csrf_token`, `csrf=token`],
        [`theme`, `light`],
      ]),
    );
    expect(getCookieValue(`theme=light`, `theme`)).toBe(`light`);
  });

  it(`prefers the canonical cookie key and falls back across readable aliases`, () => {
    expect(
      getPreferredCookieValue(`__legacy_admin_csrf_token=legacy`, `admin_csrf_token`, [`__legacy_admin_csrf_token`]),
    ).toBe(`legacy`);
    expect(
      getPreferredCookieValue(`__legacy_admin_csrf_token=legacy; admin_csrf_token=current`, `admin_csrf_token`, [
        `__legacy_admin_csrf_token`,
      ]),
    ).toBe(`current`);
  });

  it(`merges set-cookie values into an outgoing cookie header`, () => {
    expect(
      mergeSetCookieValuesIntoHeader(`theme=light; admin_access=stale`, [
        `admin_access=fresh; Path=/; HttpOnly`,
        `admin_refresh=refresh; Path=/; HttpOnly`,
      ]),
    ).toBe(`theme=light; admin_access=fresh; admin_refresh=refresh`);
  });

  it(`reads multiple set-cookie headers from a response header bag`, () => {
    const headers = new Headers();
    headers.append(`set-cookie`, `admin_access=fresh; Path=/; HttpOnly`);
    headers.append(`set-cookie`, `admin_refresh=refresh; Path=/; HttpOnly`);

    expect(mergeSetCookieHeadersIntoHeader(`theme=light; admin_access=stale`, headers)).toBe(
      `theme=light; admin_access=fresh; admin_refresh=refresh`,
    );
  });
});
