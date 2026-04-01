import { ACCOUNT_TYPE, CONTRACTOR_KIND, type TAccountType, type TContractorKind } from '@remoola/api-types';

import { type SignupFormState } from './types';

export interface SignupQuerySeed {
  accountTypeParam?: string | null;
  contractorKindParam?: string | null;
  googleSignupToken?: string | null;
}

function parseAccountType(raw: string | null | undefined): TAccountType | null {
  return raw === ACCOUNT_TYPE.BUSINESS || raw === ACCOUNT_TYPE.CONTRACTOR ? raw : null;
}

function parseContractorKind(raw: string | null | undefined): TContractorKind | null {
  return raw === CONTRACTOR_KIND.ENTITY || raw === CONTRACTOR_KIND.INDIVIDUAL ? raw : null;
}

// Explicit-state-first policy: user-chosen branch/enum fields start as null
// and are never hidden behind mobile-style auto-defaults.
export function createInitialSignupFormState(querySeed?: SignupQuerySeed): SignupFormState {
  const accountType = parseAccountType(querySeed?.accountTypeParam);
  const contractorKind = parseContractorKind(querySeed?.contractorKindParam);

  return {
    signupDetails: {
      email: ``,
      password: ``,
      confirmPassword: ``,
      accountType,
      contractorKind: accountType === ACCOUNT_TYPE.CONTRACTOR ? contractorKind : null,
      howDidHearAboutUs: null,
      howDidHearAboutUsOther: null,
    },
    individualDetails: {
      firstName: ``,
      lastName: ``,
      citizenOf: ``,
      countryOfTaxResidence: ``,
      legalStatus: null,
      taxId: ``,
      dateOfBirth: ``,
      passportOrIdNumber: ``,
      phoneNumber: ``,
    },
    entityDetails: {
      countryOfTaxResidence: ``,
      taxId: ``,
      phoneNumber: ``,
      legalAddress: ``,
    },
    organizationDetails: {
      name: ``,
      size: null,
      consumerRole: null,
    },
    addressDetails: {
      postalCode: ``,
      country: ``,
      state: ``,
      city: ``,
      street: ``,
    },
    googleSignupToken: querySeed?.googleSignupToken ?? null,
    googleHydrationLoading: false,
    googleHydrationError: null,
    hydratedGoogleToken: null,
  };
}
