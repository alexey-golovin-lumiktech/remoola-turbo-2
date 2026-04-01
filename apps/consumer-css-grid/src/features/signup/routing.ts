import { ACCOUNT_TYPE, type TAccountType, type TContractorKind } from '@remoola/api-types';

interface SignupFlowRedirectInput {
  accountType: TAccountType | null;
  contractorKind: TContractorKind | null;
  googleSignupToken: string | null;
}

export function getSignupFlowRedirect({
  accountType,
  contractorKind,
  googleSignupToken,
}: SignupFlowRedirectInput): string | null {
  if (!accountType) {
    return googleSignupToken
      ? `/signup/start?googleSignupToken=${encodeURIComponent(googleSignupToken)}`
      : `/signup/start`;
  }

  if (accountType === ACCOUNT_TYPE.CONTRACTOR && !contractorKind) {
    const params = new URLSearchParams();
    params.set(`accountType`, accountType);
    if (googleSignupToken) {
      params.set(`googleSignupToken`, googleSignupToken);
    }
    return `/signup/start/contractor-kind?${params.toString()}`;
  }

  return null;
}
