'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { ACCOUNT_TYPE, CONTRACTOR_KIND } from '@remoola/api-types';

import { getSignupFlowRedirect } from './routing';
import styles from './SignupFlowView.module.css';
import { useSignupForm } from './SignupFormContext';
import { SignupStepsProvider, useSignupSteps } from './SignupStepsContext';
import { STEP_NAME } from './stepNames';
import { Stepper } from './ui/Stepper';
import { AddressDetailsStep } from './ui/steps/AddressDetailsStep';
import { OrganizationDetailsStep } from './ui/steps/OrganizationDetailsStep';
import { PersonalDetailsStep } from './ui/steps/PersonalDetailsStep';
import { SignupDetailsStep } from './ui/steps/SignupDetailsStep';
import { ExclamationCircleIcon } from '../../shared/ui/icons/ExclamationCircleIcon';

function SignupStepsContent() {
  const { currentStep } = useSignupSteps();
  return (
    <>
      <div className={styles.stickyHeader}>
        <Stepper />
      </div>
      {currentStep === STEP_NAME.SIGNUP_DETAILS ? <SignupDetailsStep /> : null}
      {currentStep === STEP_NAME.PERSONAL_DETAILS ? <PersonalDetailsStep /> : null}
      {currentStep === STEP_NAME.ADDRESS_DETAILS ? <AddressDetailsStep /> : null}
      {currentStep === STEP_NAME.ORGANIZATION_DETAILS ? <OrganizationDetailsStep /> : null}
    </>
  );
}

export function SignupFlowView() {
  const router = useRouter();
  const { signupDetails, googleSignupToken, googleHydrationError, retryGoogleHydration } = useSignupForm();
  const accountType = signupDetails.accountType;
  const contractorKind = signupDetails.contractorKind;

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

  if (googleHydrationError) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <div className={styles.errorInner}>
            <ExclamationCircleIcon className={styles.errorIcon} />
            <div className={styles.errorContent}>
              <p className={styles.errorTitle}>{googleHydrationError}</p>
              <button type="button" onClick={retryGoogleHydration} className={styles.retryBtn}>
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!accountType || (accountType === ACCOUNT_TYPE.CONTRACTOR && !contractorKind)) return null;
  const kind =
    accountType === ACCOUNT_TYPE.CONTRACTOR
      ? (contractorKind ?? CONTRACTOR_KIND.INDIVIDUAL)
      : CONTRACTOR_KIND.INDIVIDUAL;

  return (
    <SignupStepsProvider accountType={accountType} contractorKind={kind}>
      <div className={styles.container} data-testid="consumer-signup-flow">
        <SignupStepsContent />
      </div>
    </SignupStepsProvider>
  );
}
