import { ACCOUNT_TYPE, CONTRACTOR_KIND } from '@remoola/api-types';

import { type SignupFormState } from './types';

type SignupPayload = {
  email: string;
  password?: string;
  accountType: string;
  contractorKind?: string;
  howDidHearAboutUs: string | null;
  howDidHearAboutUsOther: string | null;
  addressDetails: {
    postalCode: string;
    country: string;
    state: string;
    city: string;
    street: string;
  };
  organizationDetails?: {
    name: string;
    size: string;
    consumerRole: string;
  };
  personalDetails?: {
    firstName?: string | null;
    lastName?: string | null;
    citizenOf?: string;
    dateOfBirth?: string;
    legalStatus?: string | null;
    countryOfTaxResidence?: string;
    taxId?: string;
    passportOrIdNumber?: string;
    phoneNumber?: string;
  };
};

function buildEntityCompatibilityPersonalDetails(
  state: SignupFormState,
): NonNullable<SignupPayload[`personalDetails`]> {
  const { entityDetails } = state;

  // `api-v2` still reads these entity fields from `personalDetails`.
  return {
    firstName: null,
    lastName: null,
    citizenOf: entityDetails.countryOfTaxResidence,
    legalStatus: null,
    countryOfTaxResidence: entityDetails.countryOfTaxResidence,
    taxId: entityDetails.taxId,
    passportOrIdNumber: entityDetails.taxId,
    phoneNumber: entityDetails.phoneNumber,
    dateOfBirth: `1970-01-01`,
  };
}

export function buildSignupPayload(state: SignupFormState): SignupPayload {
  const { signupDetails, individualDetails, organizationDetails, addressDetails, googleSignupToken } = state;
  const isGoogleSignup = Boolean(googleSignupToken);
  const isBusiness = signupDetails.accountType === ACCOUNT_TYPE.BUSINESS;
  const isContractorEntity =
    signupDetails.accountType === ACCOUNT_TYPE.CONTRACTOR && signupDetails.contractorKind === CONTRACTOR_KIND.ENTITY;
  const isContractorIndividual =
    signupDetails.accountType === ACCOUNT_TYPE.CONTRACTOR &&
    signupDetails.contractorKind === CONTRACTOR_KIND.INDIVIDUAL;

  const payload: SignupPayload = {
    email: signupDetails.email.trim().toLowerCase(),
    ...(isGoogleSignup ? {} : { password: signupDetails.password }),
    accountType: signupDetails.accountType!,
    ...(signupDetails.accountType === ACCOUNT_TYPE.CONTRACTOR && signupDetails.contractorKind
      ? { contractorKind: signupDetails.contractorKind }
      : {}),
    howDidHearAboutUs: signupDetails.howDidHearAboutUs,
    howDidHearAboutUsOther:
      signupDetails.howDidHearAboutUsOther && signupDetails.howDidHearAboutUsOther.trim().length > 0
        ? signupDetails.howDidHearAboutUsOther.trim()
        : null,
    addressDetails: {
      postalCode: addressDetails.postalCode.trim(),
      country: addressDetails.country.trim(),
      state: addressDetails.state.trim(),
      city: addressDetails.city.trim(),
      street: addressDetails.street.trim(),
    },
  };

  if (isBusiness || isContractorEntity) {
    payload.organizationDetails = {
      name: organizationDetails.name.trim(),
      size: organizationDetails.size!,
      consumerRole: organizationDetails.consumerRole!,
    };
    payload.personalDetails = buildEntityCompatibilityPersonalDetails(state);
  }

  if (isContractorIndividual) {
    payload.personalDetails = {
      firstName: individualDetails.firstName.trim(),
      lastName: individualDetails.lastName.trim(),
      citizenOf: individualDetails.citizenOf.trim(),
      dateOfBirth: individualDetails.dateOfBirth,
      legalStatus: individualDetails.legalStatus,
      countryOfTaxResidence: individualDetails.countryOfTaxResidence.trim(),
      taxId: individualDetails.taxId.trim(),
      passportOrIdNumber: individualDetails.passportOrIdNumber.trim(),
      phoneNumber: individualDetails.phoneNumber.trim(),
    };
  }

  return payload;
}
