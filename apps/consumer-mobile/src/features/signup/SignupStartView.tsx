'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ACCOUNT_TYPE, type TAccountType } from '@remoola/api-types';
import { ClipboardIcon, UserIcon } from '@remoola/ui';

import { useSignupForm } from './SignupFormContext';
import styles from './SignupStartView.module.css';
import { CheckCircleIcon } from '../../shared/ui/icons/CheckCircleIcon';
import { ExclamationCircleIcon } from '../../shared/ui/icons/ExclamationCircleIcon';
import { InformationCircleIcon } from '../../shared/ui/icons/InformationCircleIcon';

export function SignupStartView() {
  const router = useRouter();
  const params = useSearchParams();
  const { signupDetails, updateSignup, updatePersonal, googleSignupToken, setGoogleSignupToken } = useSignupForm();
  const googleSignupTokenFromUrl = params.get(`googleSignupToken`);
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
    if (!googleSignupTokenFromUrl) {
      void fetch(`/api/consumer/auth/clear-cookies`, { method: `POST`, credentials: `include` });
      return;
    }
  }, [googleSignupTokenFromUrl]);

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
            accountType: ACCOUNT_TYPE.CONTRACTOR,
            ...(fetchedEmail ? { email: fetchedEmail } : {}),
          });
          if (fetchedGivenName || fetchedFamilyName) {
            updatePersonal({
              ...(fetchedGivenName ? { firstName: fetchedGivenName } : {}),
              ...(fetchedFamilyName ? { lastName: fetchedFamilyName } : {}),
            });
          }
        }
      }
    };
    hydrateFromGoogle();
  }, [googleSignupTokenFromUrl, setGoogleSignupToken, updateSignup, updatePersonal, retryTrigger]);

  const selectType = (type: TAccountType) => {
    updateSignup({ accountType: type });
  };

  const onNext = () => {
    if (!signupDetails.accountType) return;
    if (signupDetails.accountType === ACCOUNT_TYPE.BUSINESS) {
      const q = googleSignupToken ? `?googleSignupToken=${encodeURIComponent(googleSignupToken)}` : ``;
      router.push(`/signup${q}`);
    } else {
      const q = googleSignupToken ? `?googleSignupToken=${encodeURIComponent(googleSignupToken)}` : ``;
      router.push(`/signup/start/contractor-kind${q}`);
    }
  };

  const isSelected = (type: TAccountType) => signupDetails.accountType === type;

  useEffect(() => {
    if (signupDetails.accountType === null) {
      updateSignup({ accountType: ACCOUNT_TYPE.CONTRACTOR });
    }
  }, [signupDetails.accountType, updateSignup]);

  return (
    <div className={styles.root} data-testid="consumer-signup-start-page">
      <div className={styles.header}>
        <h1 className={styles.title}>Welcome to Remoola</h1>
        <p className={styles.subtitle}>Let&apos;s get started by setting up your account</p>
      </div>

      {hydrateError ? (
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
      ) : null}

      <div className={styles.card}>
        {googleSignupTokenFromUrl && signupDetails.email ? (
          <div className={styles.googleBanner}>
            <p className={styles.googleBannerText}>
              <InformationCircleIcon className={styles.googleBannerIcon} />
              Signing up with {signupDetails.email}
            </p>
          </div>
        ) : null}
        <div className={styles.stepSection}>
          <p className={styles.stepLabel}>Step 1 of 4</p>
          <h2 className={styles.stepTitle}>Choose your account type</h2>
          <p className={styles.stepSub}>Select the option that best describes you</p>
        </div>

        <div className={styles.options} data-testid="consumer-signup-start-options">
          <button
            type="button"
            data-testid="consumer-signup-start-option-contractor"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              selectType(ACCOUNT_TYPE.CONTRACTOR);
            }}
            className={`${styles.optionBtn} ${isSelected(ACCOUNT_TYPE.CONTRACTOR) ? styles.optionBtnSelected : styles.optionBtnUnselected}`}
          >
            {isSelected(ACCOUNT_TYPE.CONTRACTOR) ? <div className={styles.optionOverlay} /> : null}
            <div
              className={`${styles.optionIconWrap} ${isSelected(ACCOUNT_TYPE.CONTRACTOR) ? styles.optionIconWrapSelected : styles.optionIconWrapUnselected}`}
            >
              <UserIcon size={24} />
            </div>
            <div className={styles.optionContent}>
              <div className={styles.optionTitleRow}>
                <span
                  className={
                    isSelected(ACCOUNT_TYPE.CONTRACTOR) ? styles.optionTitleSelected : styles.optionTitleUnselected
                  }
                >
                  Contractor
                </span>
                {isSelected(ACCOUNT_TYPE.CONTRACTOR) ? <CheckCircleIcon className={styles.checkIcon} /> : null}
              </div>
              <p className={styles.optionDesc}>For freelancers and independent workers</p>
            </div>
          </button>

          <button
            type="button"
            data-testid="consumer-signup-start-option-business"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              selectType(ACCOUNT_TYPE.BUSINESS);
            }}
            className={`${styles.optionBtn} ${isSelected(ACCOUNT_TYPE.BUSINESS) ? styles.optionBtnSelected : styles.optionBtnUnselected}`}
          >
            {isSelected(ACCOUNT_TYPE.BUSINESS) ? <div className={styles.optionOverlay} /> : null}
            <div
              className={`${styles.optionIconWrap} ${isSelected(ACCOUNT_TYPE.BUSINESS) ? styles.optionIconWrapSelected : styles.optionIconWrapUnselected}`}
            >
              <ClipboardIcon size={24} />
            </div>
            <div className={styles.optionContent}>
              <div className={styles.optionTitleRow}>
                <span
                  className={
                    isSelected(ACCOUNT_TYPE.BUSINESS) ? styles.optionTitleSelected : styles.optionTitleUnselected
                  }
                >
                  Business
                </span>
                {isSelected(ACCOUNT_TYPE.BUSINESS) ? <CheckCircleIcon className={styles.checkIcon} /> : null}
              </div>
              <p className={styles.optionDesc}>For companies and organizations</p>
            </div>
          </button>
        </div>

        <button
          type="button"
          data-testid="consumer-signup-start-btn-next"
          disabled={!signupDetails.accountType}
          onClick={onNext}
          className={styles.nextBtn}
        >
          Continue
        </button>
      </div>

      <p className={styles.footer}>
        Already have an account?{` `}
        <a href="/login" className={styles.signinLink}>
          Sign in
        </a>
      </p>
    </div>
  );
}
