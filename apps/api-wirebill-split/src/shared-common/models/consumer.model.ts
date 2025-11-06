import { type ContractorKind, type AccountType } from '@remoola/database';

import type { HowDidHearAboutUsValue } from '../types';
import type { IBaseModel } from './base.model';

export type IConsumerModel = {
  email: string;
  verified: boolean;
  legalVerified: boolean;

  password?: string;
  salt?: string;
  firstName?: string;
  lastName?: string;

  howDidHearAboutUs?: string | HowDidHearAboutUsValue;
  accountType?: AccountType;
  contractorKind?: ContractorKind;
  stripeCustomerId?: string;

  googleProfileDetailsId?: string;
  personalDetailsId?: string;
  addressDetailsId?: string;
  organizationDetailsId?: string;
} & IBaseModel;
