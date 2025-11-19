'use client';

import { type ReactNode, useState, useMemo, useContext, createContext } from 'react';

import {
  type ISignupFormState,
  type ISignupDetails,
  type IPersonalDetails,
  type IOrganizationDetails,
  type IAddressDetails,
  type IAccountType,
  type IContractorKind,
  HOW_DID_HEAR_ABOUT_US,
  ORGANIZATION_SIZE,
  CONSUMER_ROLE,
} from '../types';

interface SignupFormContextValue {
  state: ISignupFormState;

  signupDetails: ISignupDetails;
  personalDetails: IPersonalDetails;
  organizationDetails: IOrganizationDetails;
  addressDetails: IAddressDetails;

  updateSignup: (patch: Partial<ISignupDetails>) => void;
  updatePersonal: (patch: Partial<IPersonalDetails>) => void;
  updateOrganization: (patch: Partial<IOrganizationDetails>) => void;
  updateAddress: (patch: Partial<IAddressDetails>) => void;

  accountType: IAccountType;
  contractorKind: IContractorKind;
}

const SignupFormContext = createContext<SignupFormContextValue | null>(null);

const initialState: ISignupFormState = {
  signupDetails: {
    email: ``,
    password: ``,
    confirmPassword: ``,
    accountType: null,
    contractorKind: null,

    howDidHearAboutUs: HOW_DID_HEAR_ABOUT_US.GOOGLE,
    howDidHearAboutUsOther: null,
  },
  personalDetails: {
    firstName: ``,
    lastName: ``,
    citizenOf: ``,
    countryOfTaxResidence: ``,
    legalStatus: null,
    taxId: ``,
    dateOfBirth: ``,
    passportOrIdNumber: ``,
    phoneNumber: ``,
  },
  organizationDetails: {
    name: ``,
    size: ORGANIZATION_SIZE.SMALL,

    consumerRole: CONSUMER_ROLE.FOUNDER, // NEW
    consumerRoleOther: null, // NEW
  },
  addressDetails: {
    postalCode: ``,
    country: ``,
    state: ``,
    city: ``,
    street: ``,
  },
};

export function SignupFormProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ISignupFormState>(initialState);

  const updateSignup = (patch: Partial<ISignupDetails>) => {
    setState((prev) => ({ ...prev, signupDetails: { ...prev.signupDetails, ...patch } }));
  };

  const updatePersonal = (patch: Partial<IPersonalDetails>) => {
    setState((prev) => ({ ...prev, personalDetails: { ...prev.personalDetails, ...patch } }));
  };

  const updateOrganization = (patch: Partial<IOrganizationDetails>) => {
    setState((prev) => ({
      ...prev,
      organizationDetails: { ...prev.organizationDetails, ...patch },
    }));
  };

  const updateAddress = (patch: Partial<IAddressDetails>) => {
    setState((prev) => ({ ...prev, addressDetails: { ...prev.addressDetails, ...patch } }));
  };

  const value = useMemo<SignupFormContextValue>(
    () => ({
      state,
      signupDetails: state.signupDetails,
      personalDetails: state.personalDetails,
      organizationDetails: state.organizationDetails,
      addressDetails: state.addressDetails,
      updateSignup,
      updatePersonal,
      updateOrganization,
      updateAddress,
      accountType: state.signupDetails.accountType!,
      contractorKind: state.signupDetails.contractorKind!,
    }),
    [state],
  );

  return <SignupFormContext.Provider value={value}>{children}</SignupFormContext.Provider>;
}

export const useSignupForm = (): SignupFormContextValue => {
  const ctx = useContext(SignupFormContext);
  if (!ctx) throw new Error(`useSignupForm must be used within SignupFormProvider`);
  return ctx;
};
