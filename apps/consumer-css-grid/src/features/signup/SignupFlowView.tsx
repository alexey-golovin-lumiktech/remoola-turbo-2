'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { getSignupFlowRedirect } from './routing';
import styles from './SignupFlowView.module.css';
import { useSignupForm } from './SignupFormContext';
import { SignupStepsProvider, useSignupSteps } from './SignupStepsContext';
import { STEP_NAME } from './stepNames';
import { Stepper } from './ui/Stepper';
import { AddressDetailsStep } from './ui/steps/AddressDetailsStep';
import { EntityDetailsStep } from './ui/steps/EntityDetailsStep';
import { IndividualDetailsStep } from './ui/steps/IndividualDetailsStep';
import { OrganizationDetailsStep } from './ui/steps/OrganizationDetailsStep';
import { SignupDetailsStep } from './ui/steps/SignupDetailsStep';

function SignupStepsContent() {
  const { currentStep } = useSignupSteps();

  return (
    <>
      {currentStep === STEP_NAME.SIGNUP_DETAILS ? <SignupDetailsStep /> : null}
      {currentStep === STEP_NAME.INDIVIDUAL_DETAILS ? <IndividualDetailsStep /> : null}
      {currentStep === STEP_NAME.ENTITY_DETAILS ? <EntityDetailsStep /> : null}
      {currentStep === STEP_NAME.ADDRESS_DETAILS ? <AddressDetailsStep /> : null}
      {currentStep === STEP_NAME.ORGANIZATION_DETAILS ? <OrganizationDetailsStep /> : null}
    </>
  );
}

export function SignupFlowView() {
  const router = useRouter();
  const { accountType, contractorKind, isContractor, googleSignupToken, googleHydrationError, retryGoogleHydration } =
    useSignupForm();

  useEffect(() => {
    const redirectTarget = getSignupFlowRedirect({ accountType, contractorKind, googleSignupToken });
    if (redirectTarget) {
      router.replace(redirectTarget);
    }
  }, [accountType, contractorKind, googleSignupToken, isContractor, router]);

  if (!accountType || (isContractor && !contractorKind)) {
    return null;
  }

  return (
    <SignupStepsProvider accountType={accountType} contractorKind={contractorKind}>
      <div className={styles.root}>
        <div className={styles.container}>
          <div className={styles.hero}>
            <p className={styles.eyebrow}>Consumer signup</p>
            <h1 className={styles.title}>Complete your signup</h1>
            <p className={styles.subtitle}>Follow the steps for your account setup.</p>
          </div>

          <div className={styles.layout}>
            <div className={styles.rail}>
              <div className={styles.stickyRail}>
                <Stepper />
                {googleHydrationError ? (
                  <div className={styles.errorCard}>
                    <p>{googleHydrationError}</p>
                    <button type="button" onClick={retryGoogleHydration} className={styles.retryBtn}>
                      Retry Google session
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className={styles.main}>
              <SignupStepsContent />
            </div>
          </div>
        </div>
      </div>
    </SignupStepsProvider>
  );
}
