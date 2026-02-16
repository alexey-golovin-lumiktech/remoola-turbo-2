'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { ErrorBoundary, ErrorState } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';
import { type IAccountType, ACCOUNT_TYPE } from '../../../../types';
import { useSignupForm } from '../hooks/useSignupForm';

const {
  signupStartCard,
  signupStartHeader,
  signupStartInfo,
  signupStartInfoTitle,
  signupStartList,
  signupStartNextButton,
  signupStartOptionActive,
  signupStartOptionBase,
  signupStartOptionEmoji,
  signupStartOptionInactive,
  signupStartOptionLabelActive,
  signupStartOptionLabelBase,
  signupStartOptionLabelInactive,
  signupStartOptions,
  signupStartPageContainer,
  signupStartSubtitle,
  signupStartTitle,
} = styles;

function ChooseAccountTypeStepInner() {
  const router = useRouter();
  const params = useSearchParams();
  const {
    signupDetails: signup,
    updateSignup,
    updatePersonal,
    setGoogleSignupToken,
    googleSignupToken,
  } = useSignupForm();
  const googleSignupTokenFromUrl = params.get(`googleSignupToken`);
  const hydratedRef = useRef(false);
  const isMountedRef = useRef(true);
  const [emailHydrated, setEmailHydrated] = useState(false);
  const [hydrateError, setHydrateError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!googleSignupTokenFromUrl) {
      void fetch(`/api/consumer/auth/clear-cookies`, { method: `POST`, credentials: `include` });
    }
  }, [googleSignupTokenFromUrl]);

  const selectType = (type: IAccountType) => {
    updateSignup({ accountType: type });
  };

  const onNext = () => {
    if (!signup.accountType) return;

    if (signup.accountType === ACCOUNT_TYPE.BUSINESS) {
      const path = googleSignupToken ? `/signup?googleSignupToken=${encodeURIComponent(googleSignupToken)}` : `/signup`;
      router.push(path);
    } else {
      const path = googleSignupToken
        ? `/signup/start/contractor-kind?googleSignupToken=${encodeURIComponent(googleSignupToken)}`
        : `/signup/start/contractor-kind`;
      router.push(path);
    }
  };

  const isSelected = (type: IAccountType) => signup.accountType === type;

  useEffect(() => {
    if (signup.accountType === null) {
      updateSignup({ accountType: ACCOUNT_TYPE.CONTRACTOR });
    }
  }, [signup.accountType, updateSignup]);

  const handleRetryHydrate = () => {
    setHydrateError(null);
    hydratedRef.current = false;
    setRetryTrigger((t) => t + 1);
  };

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
            accountType: ACCOUNT_TYPE.CONTRACTOR,
            contractorKind: null,
            ...(fetchedEmail ? { email: fetchedEmail } : {}),
          });
          if (fetchedGivenName || fetchedFamilyName) {
            updatePersonal({
              ...(fetchedGivenName ? { firstName: fetchedGivenName } : {}),
              ...(fetchedFamilyName ? { lastName: fetchedFamilyName } : {}),
            });
          }
          setEmailHydrated(true);
        }
      }
    };
    hydrateFromGoogle();
  }, [googleSignupTokenFromUrl, retryTrigger, setGoogleSignupToken, updatePersonal, updateSignup]);

  const isHydratingFromGoogle = Boolean(googleSignupTokenFromUrl) && !emailHydrated && !signup.email;

  if (!signup.accountType || isHydratingFromGoogle) {
    if (hydrateError) {
      return (
        <div className={signupStartPageContainer}>
          <ErrorState
            title="Signup session error"
            message={hydrateError}
            onRetry={handleRetryHydrate}
            showRefreshButton={true}
          />
        </div>
      );
    }
    return null;
  }

  return (
    <div className={signupStartPageContainer}>
      <div className={signupStartCard}>
        <div className={signupStartHeader}>
          <h2 className={signupStartSubtitle}>Let`s find the right account for your needs</h2>
          <h1 className={signupStartTitle}>I`m a</h1>
        </div>

        <div className={signupStartOptions}>
          <button
            type="button"
            onClick={(e) => (e.preventDefault(), e.stopPropagation(), selectType(ACCOUNT_TYPE.BUSINESS))}
            className={`${signupStartOptionBase} ${
              isSelected(ACCOUNT_TYPE.BUSINESS) ? signupStartOptionActive : signupStartOptionInactive
            }`}
          >
            <div className={signupStartOptionEmoji}>📄</div>
            <div
              className={`${signupStartOptionLabelBase} ${
                isSelected(ACCOUNT_TYPE.BUSINESS) ? signupStartOptionLabelActive : signupStartOptionLabelInactive
              }`}
            >
              BUSINESS
            </div>
          </button>

          <button
            type="button"
            onClick={(e) => (e.preventDefault(), e.stopPropagation(), selectType(ACCOUNT_TYPE.CONTRACTOR))}
            className={`${signupStartOptionBase} ${
              isSelected(ACCOUNT_TYPE.CONTRACTOR) ? signupStartOptionActive : signupStartOptionInactive
            }`}
          >
            <div className={signupStartOptionEmoji}>🏠</div>
            <div
              className={`${signupStartOptionLabelBase} ${
                isSelected(ACCOUNT_TYPE.CONTRACTOR) ? signupStartOptionLabelActive : signupStartOptionLabelInactive
              }`}
            >
              CONTRACTOR
            </div>
          </button>
        </div>

        {/* === Helpful Description (only when contractor selected) === */}
        {signup.accountType === ACCOUNT_TYPE.CONTRACTOR && (
          <div className={signupStartInfo}>
            <div className={signupStartInfoTitle}>Sign up as a contractor to:</div>
            <ul className={signupStartList}>
              <li>Get paid faster with automated invoicing</li>
              <li>Work with verified businesses worldwide</li>
              <li>Manage all your clients in one place</li>
              <li>…and grow your freelance career</li>
            </ul>
          </div>
        )}

        {signup.accountType === ACCOUNT_TYPE.BUSINESS && (
          <div className={signupStartInfo}>
            <div className={signupStartInfoTitle}>Sign up as a contractor to:</div>
            <ul className={signupStartList}>
              <li>Work compliantly from 150+ countries</li>
              <li>Automate your invoicing for every client</li>
              <li>Avoid transfer fees with 7+ payment options</li>
              <li>...other business pros</li>
            </ul>
          </div>
        )}

        <button disabled={!signup.accountType} onClick={onNext} className={signupStartNextButton}>
          Next
        </button>
      </div>
    </div>
  );
}

export default function ChooseAccountTypeStep() {
  return (
    <ErrorBoundary>
      <Suspense>
        <ChooseAccountTypeStepInner />
      </Suspense>
    </ErrorBoundary>
  );
}
