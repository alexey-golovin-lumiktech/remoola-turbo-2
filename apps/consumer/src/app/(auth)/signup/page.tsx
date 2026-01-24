'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import {
  Stepper,
  SignupDetailsStep,
  PersonalDetailsStep,
  OrganizationDetailsStep,
  AddressDetailsStep,
} from './components';
import { useSignupForm, SignupStepsProvider, useSignupSteps } from './hooks';
import { signupFlowContainer } from '../../../components/ui/classNames';
import { STEP_NAME } from '../../../types';

function SignupPageInner() {
  const router = useRouter();
  const { accountType, contractorKind } = useSignupForm();

  useEffect(() => {
    if (!accountType) router.replace(`/signup/start`);
    if (accountType === `CONTRACTOR` && !contractorKind) router.replace(`/signup/start/contractor-kind`);
  }, [accountType, contractorKind, router]);

  if (!accountType) return null;

  return (
    <SignupStepsProvider accountType={accountType} contractorKind={contractorKind}>
      <SignupFlow />
    </SignupStepsProvider>
  );
}

function SignupFlow() {
  const { currentStep } = useSignupSteps();

  return (
    <div className={signupFlowContainer}>
      <Stepper />

      {currentStep === STEP_NAME.SIGNUP_DETAILS && <SignupDetailsStep />}
      {currentStep === STEP_NAME.PERSONAL_DETAILS && <PersonalDetailsStep />}
      {currentStep === STEP_NAME.ORGANIZATION_DETAILS && <OrganizationDetailsStep />}
      {currentStep === STEP_NAME.ADDRESS_DETAILS && <AddressDetailsStep />}
    </div>
  );
}

export default function Page() {
  return <SignupPageInner />;
}
