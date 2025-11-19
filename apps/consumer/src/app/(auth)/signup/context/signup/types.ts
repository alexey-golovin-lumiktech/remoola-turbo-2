import { type Dispatch, type SetStateAction } from 'react';

import {
  type IAccountType,
  type IContractorKind,
  type ISignupDetails,
  type IPersonalDetails,
  type IAddressDetails,
  type IOrganizationDetails,
  type ACCOUNT_TYPE,
} from '../../types';

export type ISignupContext = {
  state: {
    loading: boolean;
    error: string | null;
    step: IStep;
    accountType: IAccountType;
    contractorKind: IContractorKind;
    signupDetails: ISignupDetails;
    personalDetails: IPersonalDetails;
    addressDetails: IAddressDetails;
    organizationDetails: IOrganizationDetails;
    consumerId: string | null;
  };
  action: {
    setLoading: Dispatch<SetStateAction<boolean>>;
    handleGoogleSignup: () => void;
    setError: Dispatch<SetStateAction<string | null>>;
    nextStep: () => void;
    prevStep: () => void;
    updateAccountType: <T extends IAccountType>(value: T) => void;
    updateContractorKind: <T extends IContractorKind>(value: T) => void;
    updateSignupDetails: <K extends keyof ISignupDetails>(key: K, value: ISignupDetails[K]) => void;
    updatePersonalDetails: <K extends keyof IPersonalDetails>(key: K, value: IPersonalDetails[K]) => void;
    updateAddressDetails: <K extends keyof IAddressDetails>(key: K, value: IAddressDetails[K]) => void;
    updateOrganizationDetails: <K extends keyof IOrganizationDetails>(key: K, value: IOrganizationDetails[K]) => void;
    resetSignup: () => void;
    setConsumerId: Dispatch<SetStateAction<string | null>>;
    submitSignup: () => Promise<void>;
    manualChangeStep: (step: number) => void;
  };
};

export const CONTRACTOR_CHOOSE_ACCOUNT_TYPE_STEP = {
  CONTRACTOR_CHOOSE_ACCOUNT_TYPE: `CONTRACTOR_CHOOSE_ACCOUNT_TYPE`,
} as const;

export const CONTRACTOR_SIGNUP_STEP = {
  CONTRACTOR_CHOOSE_CONTRACTOR_KIND: `CONTRACTOR_CHOOSE_CONTRACTOR_KIND`,
  CONTRACTOR_FILL_SIGNUP_FORM: `CONTRACTOR_FILL_SIGNUP_FORM`,
  CONTRACTOR_FILL_PERSONAL_DETAILS_FORM: `CONTRACTOR_FILL_PERSONAL_DETAILS_FORM`,
  CONTRACTOR_FILL_ADDRESS_DETAILS_FORM: `CONTRACTOR_FILL_ADDRESS_DETAILS_FORM`,
} as const;
export type IContractorSignupStep = (typeof CONTRACTOR_SIGNUP_STEP)[keyof typeof CONTRACTOR_SIGNUP_STEP];

export const BUSINESS_SIGNUP_STEP = {
  BUSINESS_CHOOSE_ACCOUNT_TYPE: `BUSINESS_CHOOSE_ACCOUNT_TYPE`,
  BUSINESS_FILL_SIGNUP_FORM: `BUSINESS_FILL_SIGNUP_FORM`,
  BUSINESS_FILL_PERSONAL_DETAILS_FORM: `BUSINESS_FILL_PERSONAL_DETAILS_FORM`,
  BUSINESS_FILL_ORGANIZATION_DETAILS_FORM: `BUSINESS_FILL_ORGANIZATION_DETAILS_FORM`,
} as const;
export type IBusinessSignupStep = (typeof BUSINESS_SIGNUP_STEP)[keyof typeof BUSINESS_SIGNUP_STEP];

export type ISignupStep<T extends IAccountType> = T extends typeof ACCOUNT_TYPE.BUSINESS
  ? IBusinessSignupStep
  : IContractorSignupStep;

export const CONTRACTOR_STATE_NUM_LOOKUP = {
  [CONTRACTOR_SIGNUP_STEP.CONTRACTOR_CHOOSE_CONTRACTOR_KIND]: 1,
  [CONTRACTOR_SIGNUP_STEP.CONTRACTOR_FILL_SIGNUP_FORM]: 2,
  [CONTRACTOR_SIGNUP_STEP.CONTRACTOR_FILL_PERSONAL_DETAILS_FORM]: 3,
  [CONTRACTOR_SIGNUP_STEP.CONTRACTOR_FILL_ADDRESS_DETAILS_FORM]: 4,
} as const;
export type IContractorStateNumLookup = (typeof CONTRACTOR_STATE_NUM_LOOKUP)[keyof typeof CONTRACTOR_STATE_NUM_LOOKUP];

export const BUSINESS_STATE_NUM_LOOKUP = {
  [BUSINESS_SIGNUP_STEP.BUSINESS_CHOOSE_ACCOUNT_TYPE]: 1,
  [BUSINESS_SIGNUP_STEP.BUSINESS_FILL_SIGNUP_FORM]: 2,
  [BUSINESS_SIGNUP_STEP.BUSINESS_FILL_PERSONAL_DETAILS_FORM]: 3,
  [BUSINESS_SIGNUP_STEP.BUSINESS_FILL_ORGANIZATION_DETAILS_FORM]: 4,
} as const;
export type IBusinessStateNumLookup = (typeof BUSINESS_STATE_NUM_LOOKUP)[keyof typeof BUSINESS_STATE_NUM_LOOKUP];

export type IStateNum<T extends IAccountType> = T extends typeof ACCOUNT_TYPE.CONTRACTOR
  ? IContractorStateNumLookup
  : IBusinessStateNumLookup;

export type IStep = 0 | 1 | 2 | 3 | 4;
