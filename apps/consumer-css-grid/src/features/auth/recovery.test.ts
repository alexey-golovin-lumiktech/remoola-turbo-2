import { describe, expect, it } from '@jest/globals';

import { getForgotPasswordSuccessCopy, getPasswordPanelCopy, parseForgotPasswordResponse } from './recovery';

describe(`auth recovery helpers`, () => {
  it(`parses provider-aware forgot-password responses`, () => {
    expect(
      parseForgotPasswordResponse({
        message: `If an account exists, we sent recovery instructions.`,
        recoveryMode: `provider_aware`,
      }),
    ).toEqual({
      message: `If an account exists, we sent recovery instructions.`,
      recoveryMode: `provider_aware`,
    });
  });

  it(`falls back to the default forgot-password contract for unknown payloads`, () => {
    expect(parseForgotPasswordResponse(null)).toEqual({
      message: `If an account exists, we sent instructions.`,
      recoveryMode: `default`,
    });
  });

  it(`returns create-password copy for passwordless profiles`, () => {
    expect(getPasswordPanelCopy(false)).toEqual({
      securitySummary: `Not configured`,
      panelTitle: `Create password`,
      helperText: `Create a password if you want email/password sign-in in addition to Google Sign-In.`,
      buttonIdle: `Enter new password`,
      buttonReady: `Create password`,
    });
  });

  it(`returns provider-aware success copy when recovery mode is enabled`, () => {
    expect(getForgotPasswordSuccessCopy(`provider_aware`).banner).toContain(`Google Sign-In`);
  });
});
