import { type $Enums } from '@remoola/database-2';

import { type IBaseModel } from './base.model';

export type IConsumerModel = {
  email: string;
  verified: boolean;
  legalVerified: boolean;
  verificationStatus?: $Enums.VerificationStatus;
  verificationReason?: string | null;
  verificationUpdatedAt?: Date | null;
  verificationUpdatedBy?: string | null;

  password?: string;
  salt?: string;

  howDidHearAboutUs?: null | $Enums.HowDidHearAboutUs;
  howDidHearAboutUsOther?: null | string;
  accountType?: $Enums.AccountType;
  contractorKind?: $Enums.ContractorKind;
  stripeCustomerId?: string;

  googleProfileDetailsId?: string;
  personalDetailsId?: string;
  addressDetailsId?: string;
  organizationDetailsId?: string;
} & IBaseModel;
