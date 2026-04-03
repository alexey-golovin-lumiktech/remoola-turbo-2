'use client';

import { useRouter } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import { type TAccountType, ACCOUNT_TYPE } from '@remoola/api-types';
import { cn } from '@remoola/ui';

import { ErrorBoundary, ErrorState } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';
import { useSignupForm } from '../hooks/useSignupForm';
import { buildSignupFlowPath } from '../routing';

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
  const {
    signupDetails: signup,
    updateSignup,
    googleSignupToken,
    googleHydrationError,
    retryGoogleHydration,
  } = useSignupForm();
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
    if (!signup.accountType) return;

    if (signup.accountType === ACCOUNT_TYPE.BUSINESS) {
      const path = buildSignupFlowPath(`/signup`, {
        accountType: signup.accountType,
        contractorKind: signup.contractorKind,
        googleSignupToken: activeGoogleSignupToken,
      });
      router.push(path);
    } else {
      const path = buildSignupFlowPath(`/signup/start/contractor-kind`, {
        accountType: signup.accountType,
        contractorKind: null,
        googleSignupToken: activeGoogleSignupToken,
      });
      router.push(path);
    }
  };

  const isSelected = (type: TAccountType) => signup.accountType === type;
  const getOptionClassName = (selected: boolean) =>
    cn(signupStartOptionBase, selected ? signupStartOptionActive : signupStartOptionInactive);
  const getOptionLabelClassName = (selected: boolean) =>
    cn(signupStartOptionLabelBase, selected ? signupStartOptionLabelActive : signupStartOptionLabelInactive);

  const isWaitingForGoogleSignup = Boolean(googleSignupToken) && !signup.email;

  if (isWaitingForGoogleSignup) {
    if (googleHydrationError) {
      return (
        <div className={signupStartPageContainer}>
          <ErrorState
            title="Signup session error"
            message={googleHydrationError}
            onRetry={retryGoogleHydration}
            showRefreshButton={true}
          />
        </div>
      );
    }
    return null;
  }

  return (
    <div className={signupStartPageContainer} data-testid="consumer-signup-start-page">
      <div className={signupStartCard}>
        <div className={signupStartHeader}>
          <p className={signupStartSubtitle}>Let&apos;s find the right account for your needs.</p>
          <h1 className={signupStartTitle}>I&apos;m a</h1>
        </div>

        <div className={signupStartOptions} data-testid="consumer-signup-start-options">
          <button
            type="button"
            data-testid="consumer-signup-start-option-business"
            onClick={(e) => (e.preventDefault(), e.stopPropagation(), selectType(ACCOUNT_TYPE.BUSINESS))}
            className={getOptionClassName(isSelected(ACCOUNT_TYPE.BUSINESS))}
          >
            <div className={signupStartOptionEmoji}>📄</div>
            <div className={getOptionLabelClassName(isSelected(ACCOUNT_TYPE.BUSINESS))}>BUSINESS</div>
          </button>

          <button
            type="button"
            data-testid="consumer-signup-start-option-contractor"
            onClick={(e) => (e.preventDefault(), e.stopPropagation(), selectType(ACCOUNT_TYPE.CONTRACTOR))}
            className={getOptionClassName(isSelected(ACCOUNT_TYPE.CONTRACTOR))}
          >
            <div className={signupStartOptionEmoji}>🏠</div>
            <div className={getOptionLabelClassName(isSelected(ACCOUNT_TYPE.CONTRACTOR))}>CONTRACTOR</div>
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
            <div className={signupStartInfoTitle}>Sign up as a business to:</div>
            <ul className={signupStartList}>
              <li>Work compliantly from 150+ countries</li>
              <li>Automate your invoicing for every client</li>
              <li>Avoid transfer fees with 7+ payment options</li>
              <li>...other business pros</li>
            </ul>
          </div>
        )}

        <button
          data-testid="consumer-signup-start-btn-next"
          disabled={!signup.accountType}
          onClick={onNext}
          className={signupStartNextButton}
        >
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
