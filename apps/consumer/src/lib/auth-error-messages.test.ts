import { getAuthErrorMessage, resolveAuthErrorMessage } from './auth-error-messages';

describe(`auth error messages`, () => {
  it(`maps known auth error codes to stable user messages`, () => {
    expect(getAuthErrorMessage(`ACCOUNT_SUSPENDED`, `fallback`)).toBe(
      `Your account has been suspended. Please contact support.`,
    );
  });

  it(`resolves known auth error codes passed through oauth redirects`, () => {
    expect(resolveAuthErrorMessage(`INVALID_OAUTH_EXCHANGE_TOKEN`, `fallback`)).toBe(
      `This sign-in session has expired. Please try again.`,
    );
  });

  it(`preserves backend-provided human readable oauth error messages`, () => {
    expect(resolveAuthErrorMessage(`This sign-in session has expired. Please try again.`, `fallback`)).toBe(
      `This sign-in session has expired. Please try again.`,
    );
  });

  it(`falls back for unknown non-human-readable oauth error values`, () => {
    expect(resolveAuthErrorMessage(`login_failed`, `fallback`)).toBe(`fallback`);
  });
});
