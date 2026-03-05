'use client';

import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';

import {
  ACCOUNT_TYPE,
  CONTRACTOR_KIND,
  CONSUMER_ROLE,
  HOW_DID_HEAR_ABOUT_US,
  ORGANIZATION_SIZE,
  type TAccountType,
  type TContractorKind,
  type THowDidHearAboutUs,
} from '@remoola/api-types';

export interface SignupDetails {
  email: string;
  password: string;
  confirmPassword: string;
  accountType: TAccountType | null;
  contractorKind: TContractorKind | null;
  howDidHearAboutUs: THowDidHearAboutUs | null;
  howDidHearAboutUsOther: string | null;
}

export interface PersonalDetails {
  firstName: string;
  lastName: string;
  citizenOf: string;
  countryOfTaxResidence: string;
  legalStatus: string | null;
  taxId: string;
  dateOfBirth: string;
  passportOrIdNumber: string;
  phoneNumber: string;
}

export interface OrganizationDetails {
  name: string;
  size: (typeof ORGANIZATION_SIZE)[keyof typeof ORGANIZATION_SIZE];
  consumerRole: (typeof CONSUMER_ROLE)[keyof typeof CONSUMER_ROLE];
  consumerRoleOther: string | null;
}

export interface AddressDetails {
  postalCode: string;
  country: string;
  state: string;
  city: string;
  street: string;
}

export interface SignupFormState {
  signupDetails: SignupDetails;
  personalDetails: PersonalDetails;
  organizationDetails: OrganizationDetails;
  addressDetails: AddressDetails;
  googleSignupToken: string | null;
}

const initialSignupDetails: SignupDetails = {
  email: ``,
  password: ``,
  confirmPassword: ``,
  accountType: null,
  contractorKind: null,
  howDidHearAboutUs: HOW_DID_HEAR_ABOUT_US.GOOGLE,
  howDidHearAboutUsOther: null,
};

const initialPersonal: PersonalDetails = {
  firstName: ``,
  lastName: ``,
  citizenOf: ``,
  countryOfTaxResidence: ``,
  legalStatus: null,
  taxId: ``,
  dateOfBirth: ``,
  passportOrIdNumber: ``,
  phoneNumber: ``,
};

const initialOrg: OrganizationDetails = {
  name: ``,
  size: ORGANIZATION_SIZE.SMALL,
  consumerRole: CONSUMER_ROLE.FOUNDER,
  consumerRoleOther: null,
};

const initialAddress: AddressDetails = {
  postalCode: ``,
  country: ``,
  state: ``,
  city: ``,
  street: ``,
};

interface SignupFormContextValue {
  state: SignupFormState;
  signupDetails: SignupDetails;
  personalDetails: PersonalDetails;
  organizationDetails: OrganizationDetails;
  addressDetails: AddressDetails;
  updateSignup: (patch: Partial<SignupDetails>) => void;
  updatePersonal: (patch: Partial<PersonalDetails>) => void;
  updateOrganization: (patch: Partial<OrganizationDetails>) => void;
  updateAddress: (patch: Partial<AddressDetails>) => void;
  setGoogleSignupToken: (token: string | null) => void;
  accountType: TAccountType | null;
  contractorKind: TContractorKind | null;
  isContractor: boolean;
  isBusiness: boolean;
  isContractorEntity: boolean;
  isContractorIndividual: boolean;
  googleSignupToken: string | null;
}

const SignupFormContext = createContext<SignupFormContextValue | null>(null);

const initialState: SignupFormState = {
  signupDetails: initialSignupDetails,
  personalDetails: initialPersonal,
  organizationDetails: initialOrg,
  addressDetails: initialAddress,
  googleSignupToken: null,
};

export function SignupFormProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SignupFormState>(initialState);

  const updateSignup = useCallback((patch: Partial<SignupDetails>) => {
    setState((prev) => ({
      ...prev,
      signupDetails: { ...prev.signupDetails, ...patch },
    }));
  }, []);

  const updatePersonal = useCallback((patch: Partial<PersonalDetails>) => {
    setState((prev) => ({
      ...prev,
      personalDetails: { ...prev.personalDetails, ...patch },
    }));
  }, []);

  const updateOrganization = useCallback((patch: Partial<OrganizationDetails>) => {
    setState((prev) => ({
      ...prev,
      organizationDetails: { ...prev.organizationDetails, ...patch },
    }));
  }, []);

  const updateAddress = useCallback((patch: Partial<AddressDetails>) => {
    setState((prev) => ({
      ...prev,
      addressDetails: { ...prev.addressDetails, ...patch },
    }));
  }, []);

  const setGoogleSignupToken = useCallback((token: string | null) => {
    setState((prev) => ({ ...prev, googleSignupToken: token }));
  }, []);

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
      setGoogleSignupToken,
      accountType: state.signupDetails.accountType,
      contractorKind: state.signupDetails.contractorKind,
      isContractor: state.signupDetails.accountType === ACCOUNT_TYPE.CONTRACTOR,
      isBusiness: state.signupDetails.accountType === ACCOUNT_TYPE.BUSINESS,
      isContractorEntity: state.signupDetails.contractorKind === CONTRACTOR_KIND.ENTITY,
      isContractorIndividual: state.signupDetails.contractorKind === CONTRACTOR_KIND.INDIVIDUAL,
      googleSignupToken: state.googleSignupToken,
    }),
    [state, updateSignup, updatePersonal, updateOrganization, updateAddress, setGoogleSignupToken],
  );

  return <SignupFormContext.Provider value={value}>{children}</SignupFormContext.Provider>;
}

export function useSignupForm(): SignupFormContextValue {
  const ctx = useContext(SignupFormContext);
  if (!ctx) throw new Error(`useSignupForm must be used within SignupFormProvider`);
  return ctx;
}
