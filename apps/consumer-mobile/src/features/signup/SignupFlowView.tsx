'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ACCOUNT_TYPE, CONTRACTOR_KIND } from '@remoola/api-types';

import { useSignupForm } from './SignupFormContext';
import { SignupStepsProvider, useSignupSteps } from './SignupStepsContext';
import { STEP_NAME } from './stepNames';
import { Stepper } from './ui/Stepper';
import { AddressDetailsStep } from './ui/steps/AddressDetailsStep';
import { OrganizationDetailsStep } from './ui/steps/OrganizationDetailsStep';
import { PersonalDetailsStep } from './ui/steps/PersonalDetailsStep';
import { SignupDetailsStep } from './ui/steps/SignupDetailsStep';

function SignupStepsContent() {
  const { currentStep } = useSignupSteps();
  return (
    <>
      <div
        className={`
        sticky
        top-0
        z-10
        mb-3
        bg-linear-to-b
        from-[#f8fafc]
        via-[#f8fafc]
        to-transparent
        pb-2
        pt-1
        dark:from-[#0f172a]
        dark:via-[#0f172a]
      `}
      >
        <Stepper />
      </div>
      {currentStep === STEP_NAME.SIGNUP_DETAILS && <SignupDetailsStep />}
      {currentStep === STEP_NAME.PERSONAL_DETAILS && <PersonalDetailsStep />}
      {currentStep === STEP_NAME.ADDRESS_DETAILS && <AddressDetailsStep />}
      {currentStep === STEP_NAME.ORGANIZATION_DETAILS && <OrganizationDetailsStep />}
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
      <div
        className={`
        mx-auto
        max-w-md
        px-3
        py-4
        sm:px-4
      `}
      >
        <div
          className={`
          rounded-lg
          border
          border-red-200
          bg-red-50
          p-4
          dark:border-red-900/50
          dark:bg-red-900/20
        `}
        >
          <div className={`flex items-start gap-3`}>
            <svg
              className={`
                mt-0.5
                h-5
                w-5
                shrink-0
                text-red-600
                dark:text-red-400
              `}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className={`flex-1`}>
              <p
                className={`
                text-sm
                font-semibold
                text-red-900
                dark:text-red-200
              `}
              >
                {hydrateError}
              </p>
              <button
                type="button"
                onClick={() => {
                  hydratedRef.current = false;
                  setRetryTrigger((t) => t + 1);
                }}
                className={`
                  mt-2
                  text-sm
                  font-medium
                  text-red-700
                  hover:text-red-800
                  dark:text-red-300
                  dark:hover:text-red-200
                `}
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
      <div
        className={`
        mx-auto
        max-w-md
        px-3
        py-4
        sm:px-4
      `}
        data-testid="consumer-signup-flow"
      >
        <SignupStepsContent />
      </div>
    </SignupStepsProvider>
  );
}
