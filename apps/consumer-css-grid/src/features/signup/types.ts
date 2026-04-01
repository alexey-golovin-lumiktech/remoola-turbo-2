import type {
  TAccountType,
  TConsumerRole,
  TContractorKind,
  THowDidHearAboutUs,
  TLegalStatus,
  TOrganizationSize,
} from '@remoola/api-types';

export interface SignupDetails {
  email: string;
  password: string;
  confirmPassword: string;
  accountType: TAccountType | null;
  contractorKind: TContractorKind | null;
  howDidHearAboutUs: THowDidHearAboutUs | null;
  howDidHearAboutUsOther: string | null;
}

export interface IndividualDetails {
  firstName: string;
  lastName: string;
  citizenOf: string;
  countryOfTaxResidence: string;
  legalStatus: TLegalStatus | null;
  taxId: string;
  dateOfBirth: string;
  passportOrIdNumber: string;
  phoneNumber: string;
}

export interface EntityDetails {
  countryOfTaxResidence: string;
  taxId: string;
  phoneNumber: string;
  legalAddress: string;
}

export interface OrganizationDetails {
  name: string;
  size: TOrganizationSize | null;
  consumerRole: TConsumerRole | null;
}

export interface AddressDetails {
  postalCode: string;
  country: string;
  state: string;
  city: string;
  street: string;
}

export interface SignupFormState {
  signupDetails: SignupDetails;
  individualDetails: IndividualDetails;
  entityDetails: EntityDetails;
  organizationDetails: OrganizationDetails;
  addressDetails: AddressDetails;
  googleSignupToken: string | null;
  googleHydrationLoading: boolean;
  googleHydrationError: string | null;
  hydratedGoogleToken: string | null;
}
