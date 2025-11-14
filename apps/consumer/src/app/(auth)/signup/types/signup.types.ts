import { type IAccountType, type IContractorKind } from './account.types';
import { type ILegalStatus, type IOrganizationSize } from '../context/signup';

export interface SignupSection {
  email: string;
  password: string;
  confirmPassword: string;
  accountType: IAccountType | null;
  contractorKind: IContractorKind | null;
  howDidHearAboutUs: string | null;
  howDidHearAboutUsOther: string | null;
}

export interface PersonalSection {
  firstName: string;
  lastName: string;
  citizenOf: string;
  countryOfTaxResidence: string;
  legalStatus: ILegalStatus | null;
  taxId: string;
  dateOfBirth: string; // ISO string or "YYYY-MM-DD"
  passportOrIdNumber: string;
  phoneNumber: string;
}

export interface OrganizationSection {
  name: string;
  size: IOrganizationSize | null;
  consumerRole: string | null;
  consumerRoleOther: string | null;
}

export interface AddressSection {
  postalCode: string;
  country: string;
  state: string;
  city: string;
  street: string;
}

export interface SignupFormState {
  signup: SignupSection;
  personal: PersonalSection;
  organization: OrganizationSection;
  address: AddressSection;
}
