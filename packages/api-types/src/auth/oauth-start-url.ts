export type ConsumerGoogleOAuthStartUrlOptions = {
  signupPath?: `/signup` | `/signup/start`;
  accountType?: string | null;
  contractorKind?: string | null;
};

/**
 * Builds the browser-facing consumer Google OAuth start URL.
 * `URLSearchParams` performs the required encoding, so callers must not pre-encode values.
 */
export function buildConsumerGoogleOAuthStartUrl(
  nextPath: string,
  options: ConsumerGoogleOAuthStartUrlOptions = {},
): string {
  const url = new URL(`/api/consumer/auth/google/start`, `http://localhost`);
  url.searchParams.set(`next`, nextPath);
  if (options.signupPath) url.searchParams.set(`signupPath`, options.signupPath);
  if (options.accountType) url.searchParams.set(`accountType`, options.accountType);
  if (options.contractorKind) url.searchParams.set(`contractorKind`, options.contractorKind);
  return `${url.pathname}${url.search}`;
}
