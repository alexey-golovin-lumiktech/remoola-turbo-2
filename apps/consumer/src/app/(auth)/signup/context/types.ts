import { type Dispatch, type SetStateAction } from 'react';

export const LEGAL_STATUS = {
  INDIVIDUAL: `INDIVIDUAL`,
  INDIVIDUAL_ENTREPRENEUR: `INDIVIDUAL_ENTREPRENEUR`,
  SOLE_TRADER: `SOLE_TRADER`,
} as const;

export type ILegalStatus = (typeof LEGAL_STATUS)[keyof typeof LEGAL_STATUS];

export const CONTRACTOR_KIND = {
  ENTITY: `ENTITY`,
  INDIVIDUAL: `INDIVIDUAL`,
} as const;

export type IContractorKind = (typeof CONTRACTOR_KIND)[keyof typeof CONTRACTOR_KIND];

export const ORGANIZATION_SIZE = {
  SMALL: `SMALL`,
  MEDIUM: `MEDIUM`,
  LARGE: `LARGE`,
} as const;

export type IOrganizationSize = (typeof ORGANIZATION_SIZE)[keyof typeof ORGANIZATION_SIZE];

export const ACCOUNT_TYPE = {
  BUSINESS: `BUSINESS`,
  CONTRACTOR: `CONTRACTOR`,
} as const;
export type IAccountType = (typeof ACCOUNT_TYPE)[keyof typeof ACCOUNT_TYPE];

export const HOW_DID_HEAR_ABOUT_US = {
  EMPLOYER_COMPANY: `Employer / Company`,
  EMPLOYEE_CONTRACTOR: `Employee / Contractor`,
  REFERRED_RECOMMENDED: `Referred / Recommended`,
  EMAIL_INVITE: `Email invite`,
  GOOGLE: `Google`,
  FACEBOOK: `Facebook`,
  TWITTER: `Twitter`,
  LINKED_IN: `LinkedIn`,
  OTHER: `Other`,
} as const;
export type IHowDidHearAboutUs = (typeof HOW_DID_HEAR_ABOUT_US)[keyof typeof HOW_DID_HEAR_ABOUT_US];

export type ISignupDetails = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  howDidHearAboutUs: IHowDidHearAboutUs | string;
};

export type IPersonalDetails = {
  citizenOf: string;
  dateOfBirth: string;
  passportOrIdNumber: string;
  countryOfTaxResidence: string;
  taxId: string;
  phoneNumber: string;
  legalStatus: ILegalStatus | string;
};

export type IAddressDetails = {
  postalCode: string;
  country: string;
  city: string;
  state: string;
  street: string;
};

export const CONSUMER_ROLE = {
  FOUNDER: `Founder`,
  FINANCE: `Finance`,
  MARKETING: `Marketing`,
  CUSTOMER_SUPPORT: `Customer support`,
  SALES: `Sales`,
  LEGAL: `Legal`,
  HUMAN_RESOURCE: `Human resource`,
  OPERATIONS: `Operations`,
  COMPLIANCE: `Compliance`,
  PRODUCT: `Product`,
  ENGINEERING: `Engineering`,
  ANALYSIS_DATA: `Analysis/Data`,
  OTHER: `Other`,
} as const;
export type ConsumerRole = (typeof CONSUMER_ROLE)[keyof typeof CONSUMER_ROLE];

export type IOrganizationDetails = {
  name: string;
  consumerRole: ConsumerRole | string;
  size: IOrganizationSize | string;
};

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
