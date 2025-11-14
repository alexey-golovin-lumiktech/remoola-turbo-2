'use client';

import { type ReactNode, useState, useMemo, useContext, createContext } from 'react';

import {
  type IAccountType,
  type IContractorKind,
  CONSUMER_ROLE,
  HOW_DID_HEAR_ABOUT_US,
  ORGANIZATION_SIZE,
} from '../context/signup';
import {
  type SignupFormState,
  type SignupSection,
  type PersonalSection,
  type OrganizationSection,
  type AddressSection,
} from '../types/signup.types';

interface SignupFormContextValue {
  state: SignupFormState;

  signup: SignupSection;
  personal: PersonalSection;
  organization: OrganizationSection;
  address: AddressSection;

  updateSignup: (patch: Partial<SignupSection>) => void;
  updatePersonal: (patch: Partial<PersonalSection>) => void;
  updateOrganization: (patch: Partial<OrganizationSection>) => void;
  updateAddress: (patch: Partial<AddressSection>) => void;

  accountType: IAccountType;
  contractorKind: IContractorKind;
}

const SignupFormContext = createContext<SignupFormContextValue | null>(null);

const initialState: SignupFormState = {
  signup: {
    email: ``,
    password: ``,
    confirmPassword: ``,
    accountType: null,
    contractorKind: null,

    howDidHearAboutUs: HOW_DID_HEAR_ABOUT_US.GOOGLE,
    howDidHearAboutUsOther: null,
  },
  personal: {
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
  organization: {
    name: ``,
    size: ORGANIZATION_SIZE.SMALL,

    consumerRole: CONSUMER_ROLE.FOUNDER, // NEW
    consumerRoleOther: null, // NEW
  },
  address: {
    postalCode: ``,
    country: ``,
    state: ``,
    city: ``,
    street: ``,
  },
};

export function SignupFormProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SignupFormState>(initialState);

  const updateSignup = (patch: Partial<SignupSection>) => {
    setState((prev) => ({ ...prev, signup: { ...prev.signup, ...patch } }));
  };

  console.log(`state`, state);

  const updatePersonal = (patch: Partial<PersonalSection>) => {
    setState((prev) => ({ ...prev, personal: { ...prev.personal, ...patch } }));
  };

  const updateOrganization = (patch: Partial<OrganizationSection>) => {
    setState((prev) => ({
      ...prev,
      organization: { ...prev.organization, ...patch },
    }));
  };

  const updateAddress = (patch: Partial<AddressSection>) => {
    setState((prev) => ({ ...prev, address: { ...prev.address, ...patch } }));
  };

  const value = useMemo<SignupFormContextValue>(
    () => ({
      state,
      signup: state.signup,
      personal: state.personal,
      organization: state.organization,
      address: state.address,
      updateSignup,
      updatePersonal,
      updateOrganization,
      updateAddress,
      accountType: state.signup.accountType!,
      contractorKind: state.signup.contractorKind!,
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
