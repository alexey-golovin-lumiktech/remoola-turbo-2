import { describe, expect, it } from '@jest/globals';

import { getAuthErrorMessage } from './auth-error-messages';

describe(`auth error messages`, () => {
  it(`maps known auth error codes to stable user messages`, () => {
    expect(getAuthErrorMessage(`ACCOUNT_SUSPENDED`, `fallback`)).toBe(
      `Your account has been suspended. Please contact support.`,
    );
  });

  it(`maps known oauth redirect error codes to stable user messages`, () => {
    expect(getAuthErrorMessage(`INVALID_OAUTH_EXCHANGE_TOKEN`, `fallback`)).toBe(
      `This sign-in session has expired. Please try again.`,
    );
  });

  it(`falls back for backend-provided human readable oauth messages`, () => {
    expect(getAuthErrorMessage(`This sign-in session has expired. Please try again.`, `fallback`)).toBe(`fallback`);
  });

  it(`falls back for unknown oauth error values`, () => {
    expect(getAuthErrorMessage(`login_failed`, `fallback`)).toBe(`fallback`);
  });
});
