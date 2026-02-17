import { type TLegalStatus } from '@remoola/api-types';

export type IPersonalDetails = {
  firstName: string;
  lastName: string;
  citizenOf: string;
  countryOfTaxResidence: string;
  legalStatus: TLegalStatus | null;
  taxId: string;
  dateOfBirth: string; // ISO string or "YYYY-MM-DD"
  passportOrIdNumber: string;
  phoneNumber: string;
};
