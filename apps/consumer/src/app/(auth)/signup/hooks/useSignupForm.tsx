'use client';

import { type ReactNode, useState, useMemo, createContext, useContext } from 'react';

import {
  type TAccountType,
  type TContractorKind,
  HowDidHearAboutUsValues,
  OrganizationSizes,
  AccountTypes,
  ContractorKinds,
  ConsumerRoles,
} from '@remoola/api-types';

import {
  type ISignupFormState,
  type ISignupDetails,
  type IPersonalDetails,
  type IOrganizationDetails,
  type IAddressDetails,
} from '../../../../types';

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
  setGoogleSignupToken: (token: string | null) => void;

  accountType: TAccountType;
  contractorKind: TContractorKind;

  isContractor: boolean;
  isBusiness: boolean;
  isContractorEntity: boolean;
  isContractorIndividual: boolean;
  googleSignupToken: string | null;
}

const SignupFormContext = createContext<SignupFormContextValue | null>(null);

const initialState: ISignupFormState = {
  signupDetails: {
    email: ``,
    password: ``,
    confirmPassword: ``,
    accountType: null,
    contractorKind: null,

    howDidHearAboutUs: HowDidHearAboutUsValues.GOOGLE,
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
    size: OrganizationSizes.SMALL,

    consumerRole: ConsumerRoles.FOUNDER,
    consumerRoleOther: null,
  },
  addressDetails: {
    postalCode: ``,
    country: ``,
    state: ``,
    city: ``,
    street: ``,
  },
  googleSignupToken: null,
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
    setState((prev) => ({
      ...prev,
      addressDetails: {
        ...prev.addressDetails,
        ...(patch.postalCode !== undefined && { postalCode: patch.postalCode?.trim() ?? `` }),
        ...(patch.country !== undefined && { country: patch.country?.trim() ?? `` }),
        ...(patch.state !== undefined && { state: patch.state?.trim() ?? `` }),
        ...(patch.city !== undefined && { city: patch.city?.trim() ?? `` }),
        ...(patch.street !== undefined && { street: patch.street?.trim() ?? `` }),
      },
    }));
  };

  const setGoogleSignupToken = (token: string | null) => {
    setState((prev) => ({ ...prev, googleSignupToken: token }));
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
      setGoogleSignupToken,
      accountType: state.signupDetails.accountType!,
      contractorKind: state.signupDetails.contractorKind!,
      isContractor: state.signupDetails.accountType === AccountTypes.CONTRACTOR,
      isBusiness: state.signupDetails.accountType === AccountTypes.BUSINESS,
      isContractorEntity: state.signupDetails.contractorKind === ContractorKinds.ENTITY,
      isContractorIndividual: state.signupDetails.contractorKind === ContractorKinds.INDIVIDUAL,
      googleSignupToken: state.googleSignupToken,
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
