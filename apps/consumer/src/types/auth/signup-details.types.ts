import { type IAccountType } from './account.types';
import { type IContractorKind } from './contractor-kind.types';
import { type IHowDidHearAboutUs } from './how-did-hear-about-us.types';

export type ISignupDetails = {
  email: string;
  password: string;
  confirmPassword: string;
  accountType: null | IAccountType;
  contractorKind: null | IContractorKind;
  howDidHearAboutUs: null | IHowDidHearAboutUs;
  howDidHearAboutUsOther: null | string;
};
