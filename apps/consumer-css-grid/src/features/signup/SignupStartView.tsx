'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { ACCOUNT_TYPE, type TAccountType } from '@remoola/api-types';
import { CheckCircleIcon, ClipboardIcon, UserIcon } from '@remoola/ui';

import { useSignupForm } from './SignupFormContext';
import styles from './SignupStartView.module.css';

function buildQuery(accountType: TAccountType | null, contractorKind: string | null, googleSignupToken: string | null) {
  const params = new URLSearchParams();
  if (accountType) {
    params.set(`accountType`, accountType);
  }
  if (accountType === ACCOUNT_TYPE.CONTRACTOR && contractorKind) {
    params.set(`contractorKind`, contractorKind);
  }
  if (googleSignupToken) {
    params.set(`googleSignupToken`, googleSignupToken);
  }
  const query = params.toString();
  return query ? `?${query}` : ``;
}

export function SignupStartView() {
  const router = useRouter();
  const {
    signupDetails,
    updateSignup,
    googleSignupToken,
    googleHydrationLoading,
    googleHydrationError,
    retryGoogleHydration,
  } = useSignupForm();

  useEffect(() => {
    if (!googleSignupToken) {
      void fetch(`/api/consumer/auth/clear-cookies`, { method: `POST`, credentials: `include` });
    }
  }, [googleSignupToken]);

  const onContinue = () => {
    if (!signupDetails.accountType) return;
    const query = buildQuery(signupDetails.accountType, signupDetails.contractorKind, googleSignupToken);
    if (signupDetails.accountType === ACCOUNT_TYPE.BUSINESS) {
      router.push(`/signup${query}`);
      return;
    }
    router.push(`/signup/start/contractor-kind${query}`);
  };

  const isSelected = (type: TAccountType) => signupDetails.accountType === type;

  return (
    <div className={styles.root}>
      <div className={styles.shell}>
        <div className={styles.hero}>
          <p className={styles.eyebrow}>Consumer onboarding</p>
          <h1 className={styles.title}>Choose your account type</h1>
          <p className={styles.subtitle}>Pick the signup path that fits how you work.</p>
        </div>

        <div className={styles.grid}>
          <div className={styles.panel}>
            {googleSignupToken ? (
              <div className={googleHydrationError ? styles.errorCard : styles.googleCard}>
                {googleHydrationError ? (
                  <>
                    <p>{googleHydrationError}</p>
                    <button type="button" onClick={retryGoogleHydration} className={styles.link}>
                      Retry loading Google session
                    </button>
                  </>
                ) : googleHydrationLoading ? (
                  <p>Loading your Google profile…</p>
                ) : signupDetails.email ? (
                  <p>Signing up with Google account: {signupDetails.email}</p>
                ) : (
                  <p>Preparing your Google sign-up session…</p>
                )}
              </div>
            ) : null}

            <div className={styles.cards}>
              <button
                type="button"
                onClick={() => updateSignup({ accountType: ACCOUNT_TYPE.CONTRACTOR })}
                className={`${styles.card} ${isSelected(ACCOUNT_TYPE.CONTRACTOR) ? styles.cardActive : styles.cardIdle}`}
                data-testid="consumer-css-grid-signup-account-contractor"
              >
                <div className={styles.cardIconWrap}>
                  <UserIcon size={24} />
                </div>
                {isSelected(ACCOUNT_TYPE.CONTRACTOR) ? <CheckCircleIcon size={20} className={styles.check} /> : null}
                <p className={styles.cardTitle}>Contractor</p>
                <p className={styles.cardText}>For freelancers, sole contractors, and contractor entities.</p>
              </button>

              <button
                type="button"
                onClick={() => updateSignup({ accountType: ACCOUNT_TYPE.BUSINESS, contractorKind: null })}
                className={`${styles.card} ${isSelected(ACCOUNT_TYPE.BUSINESS) ? styles.cardActive : styles.cardIdle}`}
                data-testid="consumer-css-grid-signup-account-business"
              >
                <div className={styles.cardIconWrap}>
                  <ClipboardIcon size={24} />
                </div>
                {isSelected(ACCOUNT_TYPE.BUSINESS) ? <CheckCircleIcon size={20} className={styles.check} /> : null}
                <p className={styles.cardTitle}>Business</p>
                <p className={styles.cardText}>For companies and teams managing organization-level setup.</p>
              </button>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={onContinue}
                disabled={!signupDetails.accountType}
              >
                Continue
              </button>
            </div>
          </div>
        </div>

        <p className={styles.footer}>
          Already have an account?{` `}
          <Link href="/login" prefetch={false} className={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
