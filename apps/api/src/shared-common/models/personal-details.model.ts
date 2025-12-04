import { type $Enums } from '@remoola/database-2';

import type { IBaseModel } from './base.model';

export type IPersonalDetailsModel = {
  citizenOf: string;
  dateOfBirth: string;
  passportOrIdNumber: string;

  legalStatus?: $Enums.LegalStatus; // only for contractors
  countryOfTaxResidence?: string;
  taxId?: string;
  phoneNumber?: string;
} & IBaseModel;
