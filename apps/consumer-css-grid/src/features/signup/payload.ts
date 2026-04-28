import { ACCOUNT_TYPE, CONTRACTOR_KIND, type ConsumerSignupPayload } from '@remoola/api-types';

import { type SignupFormState } from './types';

function buildEntityCompatibilityPersonalDetails(state: SignupFormState): ConsumerSignupPayload[`personalDetails`] {
  const { entityDetails } = state;

  return {
    countryOfTaxResidence: entityDetails.countryOfTaxResidence.trim(),
    taxId: entityDetails.taxId.trim(),
    phoneNumber: entityDetails.phoneNumber.trim(),
  };
}

export function buildSignupPayload(state: SignupFormState): ConsumerSignupPayload {
  const { signupDetails, individualDetails, organizationDetails, addressDetails, googleSignupToken } = state;
  const isGoogleSignup = Boolean(googleSignupToken);
  const isBusiness = signupDetails.accountType === ACCOUNT_TYPE.BUSINESS;
  const isContractorEntity =
    signupDetails.accountType === ACCOUNT_TYPE.CONTRACTOR && signupDetails.contractorKind === CONTRACTOR_KIND.ENTITY;
  const isContractorIndividual =
    signupDetails.accountType === ACCOUNT_TYPE.CONTRACTOR &&
    signupDetails.contractorKind === CONTRACTOR_KIND.INDIVIDUAL;

  const payload: ConsumerSignupPayload = {
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
