'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Stepper } from './components/Stepper';
import { AddressDetailsStep } from './components/steps/AddressDetailsStep';
import { OrganizationDetailsStep } from './components/steps/OrganizationDetailsStep';
import { PersonalDetailsStep } from './components/steps/PersonalDetailsStep';
import { SignupDetailsStep } from './components/steps/SignupDetailsStep';
import { SignupStepsProvider, useSignupSteps } from './context/SignupStepsContext';
import { useSignupForm } from './hooks/useSignupForm';
import { STEP_NAME } from './types/step.types';

function SignupPageInner() {
  const router = useRouter();
  const { accountType, contractorKind } = useSignupForm();

  // Guard: must complete pre-signup selection
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
    <div className="flex flex-col items-center px-4 py-8">
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
