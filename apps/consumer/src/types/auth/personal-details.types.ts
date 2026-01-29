import { type ILegalStatus } from './legal-status.types';

export type IPersonalDetails = {
  firstName: string;
  lastName: string;
  citizenOf: string;
  countryOfTaxResidence: string;
  legalStatus: ILegalStatus | null;
  taxId: string;
  dateOfBirth: string; // ISO string or "YYYY-MM-DD"
  passportOrIdNumber: string;
  phoneNumber: string;
};
