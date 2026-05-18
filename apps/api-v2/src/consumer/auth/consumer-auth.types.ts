import { type ConsumerAppScope } from '@remoola/api-types';

export type GoogleSignupPayload = {
  type: `google_signup`;
  email: string;
  emailVerified: boolean;
  name: string | null;
  givenName: string | null;
  familyName: string | null;
  picture: string | null;
  organization: string | null;
  sub: string | null;
  signupEntryPath: string | null;
  nextPath: string | null;
  accountType: string | null;
  contractorKind: string | null;
  appScope: ConsumerAppScope;
};

export type LoginContext = { ipAddress?: string | null; userAgent?: string | null };

export type ForgotPasswordOutcome =
  | `unknown_or_unsupported`
  | `password_reset_email_sent`
  | `provider_guidance_email_sent`
  | `cooldown_noop`;
