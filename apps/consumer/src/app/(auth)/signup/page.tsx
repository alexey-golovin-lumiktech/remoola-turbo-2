'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { AccountTypes, ContractorKinds } from '@remoola/api-types';

import {
  Stepper,
  SignupDetailsStep,
  PersonalDetailsStep,
  OrganizationDetailsStep,
  AddressDetailsStep,
} from './components';
import { useSignupForm, SignupStepsProvider, useSignupSteps } from './hooks';
import styles from '../../../components/ui/classNames.module.css';
import { STEP_NAME } from '../../../types';

const { refreshButtonClass, signupFlowContainer, spaceY4, textSecondary } = styles;

function SignupPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { accountType, contractorKind, updateSignup, updatePersonal, setGoogleSignupToken } = useSignupForm();
  const googleSignupToken = params.get(`googleSignupToken`);
  const hydratedRef = useRef(false);
  const isMountedRef = useRef(true);
  const [hydrateError, setHydrateError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const urlAccountType = params.get(`accountType`);
  const urlContractorKind = params.get(`contractorKind`);
  const hasAccountTypeInUrl = urlAccountType === AccountTypes.BUSINESS || urlAccountType === AccountTypes.CONTRACTOR;

  useEffect(() => {
    if (!accountType && !googleSignupToken) router.replace(`/signup/start`);
    else if (accountType === `CONTRACTOR` && !contractorKind && !googleSignupToken) {
      router.replace(`/signup/start/contractor-kind`);
    } else if (googleSignupToken && !accountType && !hasAccountTypeInUrl) {
      // Token in URL but no accountType in URL or form (e.g. direct link)—redirect to pick account type
      router.replace(`/signup/start?googleSignupToken=${encodeURIComponent(googleSignupToken)}`);
    }
  }, [accountType, contractorKind, googleSignupToken, hasAccountTypeInUrl, router]);

  const handleRetryHydrate = () => {
    setHydrateError(null);
    hydratedRef.current = false;
    setRetryTrigger((t) => t + 1);
  };

  useEffect(() => {
    if (!googleSignupToken || hydratedRef.current) return;

    hydratedRef.current = true;
    setGoogleSignupToken(googleSignupToken);
    setHydrateError(null);
    // Only update accountType/contractorKind from URL when present (API redirect). When coming from
    // signup/start, the URL only has googleSignupToken—preserve form state to avoid breaking the stepper.
    if (hasAccountTypeInUrl) {
      const parsedAccountType = urlAccountType;
      const parsedContractorKind =
        parsedAccountType === AccountTypes.CONTRACTOR &&
        (urlContractorKind === ContractorKinds.INDIVIDUAL || urlContractorKind === ContractorKinds.ENTITY)
          ? urlContractorKind
          : null;
      updateSignup({ accountType: parsedAccountType, contractorKind: parsedContractorKind });
    }

    const hydrateFromGoogle = async () => {
      let fetchedEmail: string | undefined;
      let fetchedGivenName: string | undefined;
      let fetchedFamilyName: string | undefined;
      let failed = false;
      try {
        const res = await fetch(
          `/api/consumer/auth/google/signup-session?token=${encodeURIComponent(googleSignupToken)}`,
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
          toast.error(msg);
        }
      } catch {
        if (isMountedRef.current) {
          failed = true;
          const msg = `Could not load your Google signup session. Please check your connection and try again.`;
          setHydrateError(msg);
          toast.error(msg);
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
  }, [
    googleSignupToken,
    urlAccountType,
    urlContractorKind,
    hasAccountTypeInUrl,
    retryTrigger,
    router,
    setGoogleSignupToken,
    updatePersonal,
    updateSignup,
  ]);

  if (!accountType && !googleSignupToken) return null;
  if (googleSignupToken && !accountType) return null;

  return (
    <SignupStepsProvider accountType={accountType} contractorKind={contractorKind}>
      <SignupFlow hydrateError={hydrateError} onRetryHydrate={handleRetryHydrate} />
    </SignupStepsProvider>
  );
}

function SignupFlow({ hydrateError, onRetryHydrate }: { hydrateError: string | null; onRetryHydrate: () => void }) {
  const { currentStep } = useSignupSteps();

  return (
    <div className={signupFlowContainer} data-testid="consumer-signup-flow">
      {hydrateError && (
        <div role="alert" className={`${spaceY4} mb-4 w-full max-w-md`} data-testid="consumer-signup-hydrate-error">
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
