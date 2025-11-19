import { type IAccountType } from './account.types';
import { type IContractorKind } from './contractor-kind.types';

export type ISignupDetails = {
  email: string;
  password: string;
  confirmPassword: string;
  accountType: IAccountType | null;
  contractorKind: IContractorKind | null;
  howDidHearAboutUs: string | null;
  howDidHearAboutUsOther: string | null;
};
