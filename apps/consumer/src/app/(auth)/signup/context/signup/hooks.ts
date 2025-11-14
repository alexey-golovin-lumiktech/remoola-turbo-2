/* eslint-disable max-len */
import { useContext, useMemo, useState } from 'react';

import { context } from './context';
import {
  CONSUMER_ROLE,
  HOW_DID_HEAR_ABOUT_US,
  type IOrganizationDetails,
  type IAddressDetails,
  type IPersonalDetails,
  type ISignupDetails,
  type ISignupContext,
  type IStep,
  ACCOUNT_TYPE,
  CONTRACTOR_KIND,
  ORGANIZATION_SIZE,
  type IAccountType,
  type IContractorKind,
  LEGAL_STATUS,
  type ILegalStatus,
  type IOrganizationSize,
} from './types';

const initial = {
  consumerId: null,
  accountType: ACCOUNT_TYPE.CONTRACTOR,
  contractorKind: CONTRACTOR_KIND.INDIVIDUAL,
  signupDetails: {
    firstName: `John`,
    lastName: `Do`,
    email: `anconsumer.fntyz@aleeas.com`,
    password: `password`,
    howDidHearAboutUs: HOW_DID_HEAR_ABOUT_US.GOOGLE,
  } satisfies ISignupDetails,
  personalDetails: {
    citizenOf: `United States`,
    dateOfBirth: `2025-12-12`,
    passportOrIdNumber: `A12345678`,
    countryOfTaxResidence: `United States`,
    taxId: ``,
    phoneNumber: `+1(212) 456-78-90`,
    legalStatus: LEGAL_STATUS.INDIVIDUAL,
  } satisfies IPersonalDetails,
  addressDetails: {
    postalCode: `123123123`,
    country: `United States`,
    city: `New York`,
    state: `Alabama`,
    street: `Winchester`,
  } satisfies IAddressDetails,
  organizationDetails: {
    name: `me-better-company`,
    consumerRole: CONSUMER_ROLE.FINANCE,
    size: ORGANIZATION_SIZE.SMALL,
  } satisfies IOrganizationDetails,
};

type AddressDetailsGPT = {
  postalCode: string;
  country: string;
  city?: string;
  state?: string;
  street?: string;
};

type PersonalDetailsGPT = {
  citizenOf: string;
  dateOfBirth: string;
  passportOrIdNumber: string;
  countryOfTaxResidence?: string;
  legalStatus?: ILegalStatus | string;
  taxId?: string;
  phoneNumber?: string;
};

type OrganizationDetailsGPT = {
  name: string;
  consumerRole: string;
  size: IOrganizationSize | string;
};

type ConsumerSignupGPT = {
  email: string;
  password: string;
  accountType: `BUSINESS` | `CONTRACTOR`;
  contractorKind?: `ENTITY` | `INDIVIDUAL`;
  firstName: string;
  lastName: string;
  howDidHearAboutUs: string;
  addressDetails: AddressDetailsGPT;
  organizationDetails?: OrganizationDetailsGPT;
  personalDetails?: PersonalDetailsGPT;
};

const STEP_NAME = {
  SIGNUP: `signup details`,
  PERSONAL: `personal details`,
  ORGANIZATION: `organization details`,
  ADDRESS: `address details`,
} as const;
type IStepName = (typeof STEP_NAME)[keyof typeof STEP_NAME];

const steps = {
  [STEP_NAME.SIGNUP]: {
    submitted: false,
    stepNumber: 2,
    label: STEP_NAME.SIGNUP,
  },
  [STEP_NAME.PERSONAL]: {
    submitted: false,
    stepNumber: 3,
    label: STEP_NAME.PERSONAL,
  },
  [STEP_NAME.ORGANIZATION]: {
    stepNumber: 4,
    submitted: false,
    label: STEP_NAME.ORGANIZATION,
  },
  [STEP_NAME.ADDRESS]: {
    stepNumber: 4,
    submitted: false,
    label: STEP_NAME.ADDRESS,
  },
} as const;
const accountTypeSteps = {
  [ACCOUNT_TYPE.BUSINESS]: {
    [STEP_NAME.SIGNUP]: steps[STEP_NAME.SIGNUP], //
    [STEP_NAME.PERSONAL]: steps[STEP_NAME.PERSONAL],
    [STEP_NAME.ORGANIZATION]: steps[STEP_NAME.ORGANIZATION],
  },
  [ACCOUNT_TYPE.CONTRACTOR]: {
    [STEP_NAME.SIGNUP]: steps[STEP_NAME.SIGNUP], //
    [STEP_NAME.PERSONAL]: steps[STEP_NAME.PERSONAL],
    [STEP_NAME.ADDRESS]: steps[STEP_NAME.ADDRESS],
  },
} as const;

const getSteps = (accountType: IAccountType, contractorKind: IContractorKind) => {
  switch (accountType) {
    case ACCOUNT_TYPE.BUSINESS: {
      return {
        [STEP_NAME.SIGNUP]: steps[STEP_NAME.SIGNUP], //
        [STEP_NAME.PERSONAL]: steps[STEP_NAME.PERSONAL],
        [STEP_NAME.ORGANIZATION]: steps[STEP_NAME.ORGANIZATION],
      };
    }
    case ACCOUNT_TYPE.CONTRACTOR: {
      switch (contractorKind) {
        case CONTRACTOR_KIND.INDIVIDUAL: {
          return {
            [STEP_NAME.SIGNUP]: steps[STEP_NAME.SIGNUP], //
            [STEP_NAME.PERSONAL]: steps[STEP_NAME.PERSONAL],
            [STEP_NAME.ADDRESS]: steps[STEP_NAME.ADDRESS],
          };
        }
        case CONTRACTOR_KIND.ENTITY: {
          return {
            [STEP_NAME.SIGNUP]: steps[STEP_NAME.SIGNUP], //
            [STEP_NAME.PERSONAL]: steps[STEP_NAME.PERSONAL],
            [STEP_NAME.ADDRESS]: steps[STEP_NAME.ADDRESS],
            [STEP_NAME.ORGANIZATION]: steps[STEP_NAME.ORGANIZATION],
          };
        }
        default:
          throw new Error(`Unexpected contractor kind`);
      }
    }
    default:
      throw new Error(`Unexpected account type`);
  }
};

export const useSignupContextProviderValue = (): ISignupContext => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [contractorKind, setContractorKind] = useState<IContractorKind>(initial.contractorKind);
  const [accountType, setAccountType] = useState<IAccountType>(initial.accountType);

  const [addressDetails, setAddressDetails] = useState<IAddressDetails>(initial.addressDetails);
  const [organizationDetails, setOrganizationDetails] = useState<IOrganizationDetails>(initial.organizationDetails);
  const [personalDetails, setPersonalDetails] = useState<IPersonalDetails>(initial.personalDetails);
  const [signupDetails, setSignupDetails] = useState<ISignupDetails>(initial.signupDetails);
  const [consumerId, setConsumerId] = useState<string | null>(initial.consumerId);

  const [step, setStep] = useState<IStep>(0);
  const maxStep = accountType === ACCOUNT_TYPE.CONTRACTOR ? 4 : 3;

  const nextStep = () => setStep((s) => (s < maxStep ? ((s + 1) as IStep) : s));
  const prevStep = () => setStep((s) => (s > 0 ? ((s - 1) as IStep) : s));
  const manualChangeStep = (step: number) => setStep(step as IStep);

  const updateAccountType = (value: IAccountType) => {
    setAccountType(value);
  };

  const updateContractorKind = (value: IContractorKind) => {
    setContractorKind(value);
  };

  const updateSignupDetails = <K extends keyof ISignupDetails>(key: K, value: ISignupDetails[K]) =>
    setSignupDetails((prev) => ({ ...prev, [key]: value }));

  const updatePersonalDetails = <K extends keyof IPersonalDetails>(key: K, value: IPersonalDetails[K]) =>
    setPersonalDetails((prev) => ({ ...prev, [key]: value }));

  const updateAddressDetails = <K extends keyof IAddressDetails>(key: K, value: IAddressDetails[K]) =>
    setAddressDetails((prev) => ({ ...prev, [key]: value }));

  const updateOrganizationDetails = <K extends keyof IOrganizationDetails>(key: K, value: IOrganizationDetails[K]) =>
    setOrganizationDetails((prev) => ({ ...prev, [key]: value }));

  const resetSignup = () => {
    setAccountType(initial.accountType);
    setContractorKind(initial.contractorKind);
    setAddressDetails(initial.addressDetails);
    setOrganizationDetails(initial.organizationDetails);
    setPersonalDetails(initial.personalDetails);
    setSignupDetails(initial.signupDetails);
    setConsumerId(initial.consumerId);
  };

  const handleGoogleSignup = () => {
    const redirectUri = `${window.location.origin}/auth/callback`;
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/google-oauth?redirect_uri=${encodeURIComponent(redirectUri)}`;
    window.location.href = url;
  };

  const submitSignup = async () => {
    const body: ConsumerSignupGPT = {
      email: signupDetails.email,
      password: signupDetails.password,
      firstName: signupDetails.firstName,
      lastName: signupDetails.lastName,
      howDidHearAboutUs: signupDetails.howDidHearAboutUs,
      accountType: accountType,
      addressDetails,
    };

    if (accountType === ACCOUNT_TYPE.CONTRACTOR) {
      body.contractorKind = contractorKind;
      body.personalDetails = personalDetails;
    } else body.organizationDetails = organizationDetails;

    try {
      setLoading(true);
      const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/signup/signup-gpt`);
      const response = await fetch(url, {
        method: `POST`,
        headers: { 'Content-Type': `application/json` },
        body: JSON.stringify(body, null, -1),
      });
      if (!response.ok) throw new Error(JSON.parse(await response.text()).message || `Signup failed`);
      const json = await response.json();
      console.log(`submitSignup json`, json);

      const complete = new URL(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/signup/${json.consumer.id}/complete-profile-creation`,
      );
      await fetch(complete);
      window.location.href = `/login`;
    } catch (err: any) {
      setError(err.message);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const state = useMemo(
    () => ({
      loading,
      error,
      step,
      accountType,
      contractorKind,
      signupDetails,
      personalDetails,
      addressDetails,
      organizationDetails,
      consumerId,
    }),
    [
      loading,
      error,
      step,
      accountType,
      contractorKind,
      signupDetails,
      personalDetails,
      addressDetails,
      organizationDetails,
      consumerId,
    ],
  );

  return {
    state,
    action: {
      setLoading,
      handleGoogleSignup,
      setError,
      nextStep,
      prevStep,
      updateAccountType,
      updateContractorKind,
      updateSignupDetails,
      updatePersonalDetails,
      updateAddressDetails,
      updateOrganizationDetails,
      resetSignup,
      setConsumerId,
      submitSignup,
      manualChangeStep,
    },
  };
};

export const useSignupContext = () => {
  const ctx = useContext(context);
  if (ctx) return ctx;
  const message = `useHomeContext called outside of provider`;
  throw message;
};
