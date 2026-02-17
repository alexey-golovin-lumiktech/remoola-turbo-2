import { type TContractorKind, type TAccountType, type THowDidHearAboutUs } from '@remoola/api-types';

export type ISignupDetails = {
  email: string;
  password: string;
  confirmPassword: string;
  accountType: null | TAccountType;
  contractorKind: null | TContractorKind;
  howDidHearAboutUs: null | THowDidHearAboutUs;
  howDidHearAboutUsOther: null | string;
};
