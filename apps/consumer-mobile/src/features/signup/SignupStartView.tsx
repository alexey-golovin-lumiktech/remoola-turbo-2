'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { ACCOUNT_TYPE, type TAccountType } from '@remoola/api-types';
import { ClipboardIcon, UserIcon } from '@remoola/ui';

import { buildSignupFlowPath } from './routing';
import { useSignupForm } from './SignupFormContext';
import styles from './SignupStartView.module.css';
import { CheckCircleIcon } from '../../shared/ui/icons/CheckCircleIcon';
import { ExclamationCircleIcon } from '../../shared/ui/icons/ExclamationCircleIcon';
import { InformationCircleIcon } from '../../shared/ui/icons/InformationCircleIcon';

export function SignupStartView() {
  const router = useRouter();
  const { signupDetails, updateSignup, googleSignupToken, googleHydrationError, retryGoogleHydration } =
    useSignupForm();
  const activeGoogleSignupToken = googleSignupToken;

  useEffect(() => {
    if (!googleSignupToken) {
      void fetch(`/api/consumer/auth/clear-cookies`, { method: `POST`, credentials: `include` });
    }
  }, [googleSignupToken]);

  const selectType = (type: TAccountType) => {
    updateSignup({ accountType: type });
  };

  const onNext = () => {
    if (!signupDetails.accountType) return;
    if (signupDetails.accountType === ACCOUNT_TYPE.BUSINESS) {
      router.push(
        buildSignupFlowPath(`/signup`, {
          accountType: signupDetails.accountType,
          contractorKind: signupDetails.contractorKind,
          googleSignupToken: activeGoogleSignupToken,
        }),
      );
    } else {
      router.push(
        buildSignupFlowPath(`/signup/start/contractor-kind`, {
          accountType: signupDetails.accountType,
          contractorKind: null,
          googleSignupToken: activeGoogleSignupToken,
        }),
      );
    }
  };

  const isSelected = (type: TAccountType) => signupDetails.accountType === type;

  return (
    <div className={styles.root} data-testid="consumer-signup-start-page">
      <div className={styles.header}>
        <h1 className={styles.title}>Welcome to Remoola</h1>
        <p className={styles.subtitle}>Let&apos;s get started by setting up your account</p>
      </div>

      {googleHydrationError ? (
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
      ) : null}

      <div className={styles.card}>
        {Boolean(googleSignupToken) && signupDetails.email ? (
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
        <Link href="/login" className={styles.signinLink}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
