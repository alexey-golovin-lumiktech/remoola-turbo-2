import { ACCOUNT_TYPE, type TAccountType, type TContractorKind } from '@remoola/api-types';

interface SignupFlowRedirectInput {
  accountType: TAccountType | null;
  contractorKind: TContractorKind | null;
  googleSignupToken: string | null;
}

export function buildSignupFlowPath(
  pathname: `/signup` | `/signup/start` | `/signup/start/contractor-kind`,
  { accountType, contractorKind, googleSignupToken }: SignupFlowRedirectInput,
): string {
  const params = new URLSearchParams();
  if (accountType) {
    params.set(`accountType`, accountType);
  }
  if (accountType === ACCOUNT_TYPE.CONTRACTOR && contractorKind) {
    params.set(`contractorKind`, contractorKind);
  }
  if (googleSignupToken) {
    params.set(`googleSignup`, `1`);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function getSignupFlowRedirect({
  accountType,
  contractorKind,
  googleSignupToken,
}: SignupFlowRedirectInput): string | null {
  if (!accountType) {
    return googleSignupToken ? `/signup/start?googleSignup=1` : `/signup/start`;
  }

  if (accountType === ACCOUNT_TYPE.CONTRACTOR && !contractorKind) {
    const params = new URLSearchParams();
    params.set(`accountType`, accountType);
    if (googleSignupToken) {
      params.set(`googleSignup`, `1`);
    }
    return `/signup/start/contractor-kind?${params.toString()}`;
  }

  return null;
}
