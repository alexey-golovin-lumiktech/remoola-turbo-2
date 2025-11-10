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
    name: `Lumiktech`,
    consumerRole: CONSUMER_ROLE.FINANCE,
    size: ORGANIZATION_SIZE.SMALL,
  } satisfies IOrganizationDetails,
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
    },
  };
};

export const useSignupContext = () => {
  const ctx = useContext(context);
  if (ctx) return ctx;
  const message = `useHomeContext called outside of provider`;
  throw message;
};
