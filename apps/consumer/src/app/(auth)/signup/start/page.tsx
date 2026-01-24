'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import {
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
} from '../../../../components/ui/classNames';
import { type IAccountType, ACCOUNT_TYPE } from '../../../../types';
import { useSignupForm } from '../hooks/useSignupForm';

export default function ChooseAccountTypeStep() {
  const router = useRouter();
  const { signupDetails: signup, updateSignup } = useSignupForm();

  const selectType = (type: IAccountType) => {
    updateSignup({ accountType: type });
  };

  const onNext = () => {
    if (!signup.accountType) return;

    if (signup.accountType === ACCOUNT_TYPE.BUSINESS) {
      router.push(`/signup`);
    } else {
      router.push(`/signup/start/contractor-kind`);
    }
  };

  const isSelected = (type: IAccountType) => signup.accountType === type;

  useEffect(() => {
    if (signup.accountType === null) {
      updateSignup({ accountType: ACCOUNT_TYPE.CONTRACTOR });
    }
  }, [signup.accountType, updateSignup]);
  if (!signup.accountType) return null;

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
            onClick={() => selectType(ACCOUNT_TYPE.BUSINESS)}
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
            onClick={() => selectType(ACCOUNT_TYPE.CONTRACTOR)}
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
