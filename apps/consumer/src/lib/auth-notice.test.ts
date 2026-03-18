import { AUTH_NOTICE_QUERY, getAuthNoticeMessage, parseAuthNotice } from '@remoola/api-types';

describe(`auth-notice`, () => {
  it(`parses known auth notice values`, () => {
    expect(parseAuthNotice(`password_changed`)).toBe(`password_changed`);
    expect(parseAuthNotice(`reset_success`)).toBe(`reset_success`);
  });

  it(`returns undefined for unknown notice values`, () => {
    expect(parseAuthNotice(`unexpected`)).toBeUndefined();
    expect(parseAuthNotice(null)).toBeUndefined();
  });

  it(`returns stable user-facing messages`, () => {
    expect(getAuthNoticeMessage(`password_changed`)).toBe(`Password updated successfully. Please sign in again.`);
    expect(getAuthNoticeMessage(`reset_success`)).toBe(
      `Password reset successful. You can now sign in with your new password.`,
    );
  });

  it(`keeps query key stable`, () => {
    expect(AUTH_NOTICE_QUERY).toBe(`auth_notice`);
  });
});
