import { AUTH_RATE_LIMIT_MESSAGE } from '@remoola/api-types';

const MESSAGE_MAP: Record<string, string> = {
  ACCOUNT_SUSPENDED: `Your account has been suspended. Please contact support.`,
  PROFILE_SUSPENDED: `Your profile has been suspended. Please contact support.`,
  INVALID_CREDENTIALS: `The email or password you entered is incorrect.`,
  TOO_MANY_LOGIN_ATTEMPTS: AUTH_RATE_LIMIT_MESSAGE,
  ACCOUNT_TEMPORARILY_LOCKED: `Too many failed sign-in attempts. Please wait a few minutes and try again.`,
  EMAIL_ALREADY_REGISTERED_SIGNUP: `This email is already registered. Sign in instead or use another email.`,
  EMAIL_ALREADY_REGISTERED_PRISMA: `This email is already registered. Sign in instead or use another email.`,
  EMAIL_MISMATCH_GOOGLE: `This email does not match your Google account. Use the same email or sign up without Google.`,
  PASSWORD_REQUIREMENTS: `Your password must be at least 8 characters long.`,
  CONTRACTOR_KIND_REQUIRED: `Please choose whether you are signing up as an individual or an entity.`,
  PERSONAL_DETAILS_REQUIRED: `Personal details are required for individual contractors.`,
  ORGANIZATION_DETAILS_REQUIRED: `Organization details are required for this account type.`,
  INVALID_DATE_OF_BIRTH: `Please enter a valid date of birth.`,
  INVALID_GOOGLE_SIGNUP_TOKEN: `This Google sign-up session has expired. Please try again.`,
  MISSING_SIGNUP_TOKEN: `Missing sign-up token. Please start the sign-up flow again.`,
  INVALID_OAUTH_EXCHANGE_TOKEN: `This sign-in session has expired. Please try again.`,
  MISSING_EXCHANGE_TOKEN: `Missing sign-in token. Please try again.`,
  INVALID_CHANGE_PASSWORD_TOKEN: `This password reset link is invalid or has expired.`,
  CONSUMER_NOT_FOUND_CHANGE_PASSWORD: `This password reset link is invalid or has expired.`,
  CHANGE_PASSWORD_FLOW_EXPIRED: `This password reset link is invalid or has expired.`,
};

export function getAuthErrorMessage(codeOrMessage: string | undefined, fallback: string): string {
  if (!codeOrMessage) return fallback;
  return MESSAGE_MAP[codeOrMessage] ?? fallback;
}

export function resolveAuthErrorMessage(codeOrMessage: string | undefined, fallback: string): string {
  if (!codeOrMessage) return fallback;

  const mappedMessage = MESSAGE_MAP[codeOrMessage];
  if (mappedMessage) {
    return mappedMessage;
  }

  return codeOrMessage.includes(` `) ? codeOrMessage : fallback;
}
