import { ACCOUNT_TYPE, CONTRACTOR_KIND, type TAccountType, type TContractorKind } from '@remoola/api-types';

export interface SignupQuerySeed {
  accountTypeParam: string | null;
  contractorKindParam: string | null;
  googleSignupToken: string | null;
  googleSignupHandoff: string | null;
}

interface SignupFlowParams {
  accountType: TAccountType | null;
  contractorKind: TContractorKind | null;
  googleSignupToken: string | null;
}

export function parseSignupAccountType(raw: string | null): TAccountType | null {
  return raw === ACCOUNT_TYPE.BUSINESS || raw === ACCOUNT_TYPE.CONTRACTOR ? raw : null;
}

export function parseSignupContractorKind(raw: string | null): TContractorKind | null {
  return raw === CONTRACTOR_KIND.INDIVIDUAL || raw === CONTRACTOR_KIND.ENTITY ? raw : null;
}

export function getSignupQuerySeed(search: string): SignupQuerySeed {
  if (!search) {
    return {
      accountTypeParam: null,
      contractorKindParam: null,
      googleSignupToken: null,
      googleSignupHandoff: null,
    };
  }

  const params = new URLSearchParams(search);
  return {
    accountTypeParam: params.get(`accountType`),
    contractorKindParam: params.get(`contractorKind`),
    googleSignupToken: params.get(`googleSignup`) ? `cookie-session` : null,
    googleSignupHandoff: params.get(`googleSignupHandoff`),
  };
}

export function buildSignupFlowPath(
  pathname: `/signup` | `/signup/start` | `/signup/start/contractor-kind`,
  { accountType, contractorKind, googleSignupToken }: SignupFlowParams,
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
}: SignupFlowParams): string | null {
  if (!accountType) {
    return buildSignupFlowPath(`/signup/start`, {
      accountType: null,
      contractorKind: null,
      googleSignupToken,
    });
  }

  if (accountType === ACCOUNT_TYPE.CONTRACTOR && !contractorKind) {
    return buildSignupFlowPath(`/signup/start/contractor-kind`, {
      accountType,
      contractorKind: null,
      googleSignupToken,
    });
  }

  return null;
}
