'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Stepper } from './components/Stepper';
import { AddressStep } from './components/steps/AddressStep';
import { OrganizationStep } from './components/steps/OrganizationStep';
import { PersonalStep } from './components/steps/PersonalStep';
import { SignupStep } from './components/steps/SignupStep';
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

      {currentStep === STEP_NAME.SIGNUP && <SignupStep />}
      {currentStep === STEP_NAME.PERSONAL && <PersonalStep />}
      {currentStep === STEP_NAME.ORGANIZATION && <OrganizationStep />}
      {currentStep === STEP_NAME.ADDRESS && <AddressStep />}
    </div>
  );
}

export default function Page() {
  return <SignupPageInner />;
}
