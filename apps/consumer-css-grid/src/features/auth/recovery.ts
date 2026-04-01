export type ForgotPasswordRecoveryMode = `default` | `provider_aware`;

export interface ForgotPasswordResponsePayload {
  message?: string;
  recoveryMode?: string;
}

export function parseForgotPasswordResponse(payload: unknown): {
  message: string;
  recoveryMode: ForgotPasswordRecoveryMode;
} {
  const data =
    payload && typeof payload === `object`
      ? (payload as ForgotPasswordResponsePayload)
      : ({} as ForgotPasswordResponsePayload);

  return {
    message: data.message?.trim() || `If an account exists, we sent instructions.`,
    recoveryMode: data.recoveryMode === `provider_aware` ? `provider_aware` : `default`,
  };
}

export function getForgotPasswordSuccessCopy(recoveryMode: ForgotPasswordRecoveryMode) {
  if (recoveryMode === `provider_aware`) {
    return {
      title: `Check your email`,
      subtitle: `If an account exists for that address, we sent recovery instructions matched to your sign-in method.`,
      banner: `Password-based accounts receive a reset link. Accounts that use Google Sign-In receive guidance to sign in first and then create a password from Settings if needed.`,
    };
  }

  return {
    title: `Check your email`,
    subtitle: `If an account exists for that address, we sent instructions to reset your password.`,
    banner: `Didn't get an email? Check spam or request another reset link in a few minutes.`,
  };
}

export function getPasswordPanelCopy(hasPassword: boolean | null | undefined) {
  if (hasPassword) {
    return {
      securitySummary: `Configured`,
      panelTitle: `Change password`,
      helperText: `Current password is required when a password is already configured.`,
      buttonIdle: `Enter password details`,
      buttonReady: `Update password`,
    };
  }

  return {
    securitySummary: `Not configured`,
    panelTitle: `Create password`,
    helperText: `Create a password if you want email/password sign-in in addition to Google Sign-In.`,
    buttonIdle: `Enter new password`,
    buttonReady: `Create password`,
  };
}
