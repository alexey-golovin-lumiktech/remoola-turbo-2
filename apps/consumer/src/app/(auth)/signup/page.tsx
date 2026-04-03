'use client';

import { useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import {
  Stepper,
  SignupDetailsStep,
  PersonalDetailsStep,
  OrganizationDetailsStep,
  AddressDetailsStep,
} from './components';
import { useSignupForm, SignupStepsProvider, useSignupSteps } from './hooks';
import localStyles from './page.module.css';
import { getSignupFlowRedirect } from './routing';
import styles from '../../../components/ui/classNames.module.css';
import { STEP_NAME } from '../../../types';

const { refreshButtonClass, signupFlowContainer, textSecondary } = styles;

function SignupPageInner() {
  const router = useRouter();
  const { accountType, contractorKind, googleSignupToken, googleHydrationError, retryGoogleHydration } =
    useSignupForm();

  useEffect(() => {
    const redirectTarget = getSignupFlowRedirect({
      accountType,
      contractorKind,
      googleSignupToken,
    });
    if (redirectTarget) {
      router.replace(redirectTarget);
    }
  }, [accountType, contractorKind, googleSignupToken, router]);

  if (!accountType) return null;

  return (
    <SignupStepsProvider accountType={accountType} contractorKind={contractorKind}>
      <SignupFlow hydrateError={googleHydrationError} onRetryHydrate={retryGoogleHydration} />
    </SignupStepsProvider>
  );
}

function SignupFlow({ hydrateError, onRetryHydrate }: { hydrateError: string | null; onRetryHydrate: () => void }) {
  const { currentStep } = useSignupSteps();

  return (
    <div className={signupFlowContainer} data-testid="consumer-signup-flow">
      {hydrateError && (
        <div role="alert" className={localStyles.hydrateErrorBox} data-testid="consumer-signup-hydrate-error">
          <p className={textSecondary}>{hydrateError}</p>
          <button
            type="button"
            data-testid="consumer-signup-hydrate-retry"
            onClick={(e) => (e.preventDefault(), e.stopPropagation(), onRetryHydrate())}
            className={refreshButtonClass}
          >
            Try again
          </button>
        </div>
      )}
      <Stepper />

      {currentStep === STEP_NAME.SIGNUP_DETAILS && <SignupDetailsStep />}
      {currentStep === STEP_NAME.PERSONAL_DETAILS && <PersonalDetailsStep />}
      {currentStep === STEP_NAME.ORGANIZATION_DETAILS && <OrganizationDetailsStep />}
      {currentStep === STEP_NAME.ADDRESS_DETAILS && <AddressDetailsStep />}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SignupPageInner />
    </Suspense>
  );
}
