import {
  type AddressDetails,
  type OrganizationDetails,
  type PersonalDetails,
  type SignupDetails,
} from './SignupFormContext';

type SignupPayload = {
  email: string;
  password?: string;
  confirmPassword?: string;
  accountType: SignupDetails[`accountType`];
  contractorKind: SignupDetails[`contractorKind`];
  howDidHearAboutUs: SignupDetails[`howDidHearAboutUs`];
  howDidHearAboutUsOther: SignupDetails[`howDidHearAboutUsOther`];
  personalDetails: PersonalDetails | EntityPersonalPayload;
  organizationDetails: OrganizationDetails | null;
  addressDetails: AddressDetails;
};

type EntityPersonalPayload = Omit<PersonalDetails, `firstName` | `lastName` | `legalStatus`> & {
  firstName: null;
  lastName: null;
  legalStatus: null;
};

interface BuildSignupPayloadArgs {
  signupDetails: SignupDetails;
  personalDetails: PersonalDetails;
  organizationDetails: OrganizationDetails;
  addressDetails: AddressDetails;
  googleSignupToken: string | null;
  isBusiness: boolean;
  isContractorEntity: boolean;
}

export function buildSignupPayload({
  signupDetails,
  personalDetails,
  organizationDetails,
  addressDetails,
  googleSignupToken,
  isBusiness,
  isContractorEntity,
}: BuildSignupPayloadArgs): SignupPayload {
  const isGoogleSignup = Boolean(googleSignupToken);
  const signupForPayload = isGoogleSignup
    ? {
        email: signupDetails.email,
        accountType: signupDetails.accountType,
        contractorKind: signupDetails.contractorKind,
        howDidHearAboutUs: signupDetails.howDidHearAboutUs,
        howDidHearAboutUsOther: signupDetails.howDidHearAboutUsOther,
      }
    : signupDetails;

  const personalPayload =
    isBusiness || isContractorEntity
      ? {
          citizenOf: personalDetails.countryOfTaxResidence,
          dateOfBirth: personalDetails.dateOfBirth || `1970-01-01`,
          passportOrIdNumber: personalDetails.taxId || `N/A`,
          countryOfTaxResidence: personalDetails.countryOfTaxResidence,
          taxId: personalDetails.taxId,
          phoneNumber: personalDetails.phoneNumber,
          firstName: null,
          lastName: null,
          legalStatus: null,
        }
      : personalDetails;

  return {
    ...signupForPayload,
    personalDetails: personalPayload,
    organizationDetails: isBusiness || isContractorEntity ? organizationDetails : null,
    addressDetails,
  };
}
