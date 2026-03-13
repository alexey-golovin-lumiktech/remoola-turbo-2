'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ACCOUNT_TYPE, CONTRACTOR_KIND } from '@remoola/api-types';

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
  const params = useSearchParams();
  const googleSignupTokenFromUrl = params.get(`googleSignupToken`);
  const { signupDetails, updateSignup, updatePersonal, setGoogleSignupToken } = useSignupForm();
  const accountType = signupDetails.accountType;
  const contractorKind = signupDetails.contractorKind;
  const [hydrateError, setHydrateError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const hydratedRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!googleSignupTokenFromUrl || hydratedRef.current) return;

    hydratedRef.current = true;
    setGoogleSignupToken(googleSignupTokenFromUrl);
    setHydrateError(null);

    const hydrateFromGoogle = async () => {
      let fetchedEmail: string | undefined;
      let fetchedGivenName: string | undefined;
      let fetchedFamilyName: string | undefined;
      let failed = false;
      try {
        const res = await fetch(
          `/api/consumer/auth/google/signup-session?token=${encodeURIComponent(googleSignupTokenFromUrl)}`,
          { credentials: `include` },
        );
        if (res.ok && isMountedRef.current) {
          const data = (await res.json().catch(() => ({}))) as {
            email?: string;
            givenName?: string;
            familyName?: string;
          };
          fetchedEmail = data?.email;
          fetchedGivenName = data?.givenName;
          fetchedFamilyName = data?.familyName;
        } else if (isMountedRef.current) {
          failed = true;
          const msg = `Could not load your Google signup session. Please try again.`;
          setHydrateError(msg);
        }
      } catch {
        if (isMountedRef.current) {
          failed = true;
          const msg = `Could not load your Google signup session. Please check your connection and try again.`;
          setHydrateError(msg);
        }
      } finally {
        if (isMountedRef.current && !failed) {
          updateSignup({
            ...(fetchedEmail ? { email: fetchedEmail } : {}),
          });
          if (fetchedGivenName || fetchedFamilyName) {
            updatePersonal({
              ...(fetchedGivenName ? { firstName: fetchedGivenName } : {}),
              ...(fetchedFamilyName ? { lastName: fetchedFamilyName } : {}),
            });
          }
          router.replace(`/signup`);
        }
      }
    };
    hydrateFromGoogle();
  }, [googleSignupTokenFromUrl, router, setGoogleSignupToken, updateSignup, updatePersonal, retryTrigger]);

  useEffect(() => {
    if (!accountType && !googleSignupTokenFromUrl) {
      router.replace(`/signup/start`);
      return;
    }
    if (accountType === ACCOUNT_TYPE.CONTRACTOR && !contractorKind && !googleSignupTokenFromUrl) {
      router.replace(`/signup/start/contractor-kind`);
    }
  }, [accountType, contractorKind, googleSignupTokenFromUrl, router]);

  if (hydrateError) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <div className={styles.errorInner}>
            <ExclamationCircleIcon className={styles.errorIcon} />
            <div className={styles.errorContent}>
              <p className={styles.errorTitle}>{hydrateError}</p>
              <button
                type="button"
                onClick={() => {
                  hydratedRef.current = false;
                  setRetryTrigger((t) => t + 1);
                }}
                className={styles.retryBtn}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!accountType) return null;
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
