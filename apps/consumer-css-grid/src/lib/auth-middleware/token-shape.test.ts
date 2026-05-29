import { describe, expect, it } from '@jest/globals';
import { NextRequest } from 'next/server';

import { getPreferredCookieValue, hasPotentialAccessToken, isObviouslyInvalidCookieToken } from './token-shape';

function createAccessToken(expiresInSecondsFromNow: number, overrides?: { alg?: string; typ?: string }) {
  const header = Buffer.from(JSON.stringify({ alg: overrides?.alg ?? `HS256`, typ: `JWT` })).toString(`base64url`);
  const payload = Buffer.from(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + expiresInSecondsFromNow,
      sub: `consumer-1`,
      typ: overrides?.typ ?? `access`,
    }),
  ).toString(`base64url`);

  return `${header}.${payload}.signature`;
}

describe(`auth middleware token shape`, () => {
  it(`prefers the requested cookie key before fallback keys`, () => {
    const request = new NextRequest(`https://example.com/settings`, {
      headers: {
        cookie: `secure_refresh=preferred; local_refresh=fallback`,
      },
    });

    expect(getPreferredCookieValue(request, `secure_refresh`, [`local_refresh`, `secure_refresh`])).toBe(`preferred`);
  });

  it(`rejects obviously invalid cookie tokens`, () => {
    expect(isObviouslyInvalidCookieToken(undefined)).toBe(true);
    expect(isObviouslyInvalidCookieToken(`line\nbreak`)).toBe(true);
    expect(isObviouslyInvalidCookieToken(`valid-token`)).toBe(false);
  });

  it(`accepts a structurally valid unexpired access token`, () => {
    expect(hasPotentialAccessToken(createAccessToken(3600))).toBe(true);
  });

  it(`rejects expired or mismatched access token payloads`, () => {
    expect(hasPotentialAccessToken(createAccessToken(-60))).toBe(false);
    expect(hasPotentialAccessToken(createAccessToken(3600, { typ: `refresh` }))).toBe(false);
    expect(hasPotentialAccessToken(createAccessToken(3600, { alg: `RS256` }))).toBe(false);
  });
});
