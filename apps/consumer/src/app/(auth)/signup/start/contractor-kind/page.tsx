'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { ACCOUNT_TYPE, CONTRACTOR_KIND, type TContractorKind } from '@remoola/api-types';

import styles from '../../../../../components/ui/classNames.module.css';
import { useSignupForm } from '../../hooks';

const {
  signupStartBackButton,
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

export default function ChooseContractorKindStep() {
  const router = useRouter();
  const { signupDetails: signup, updateSignup, googleSignupToken } = useSignupForm();

  const selectKind = (kind: TContractorKind) => {
    updateSignup({ contractorKind: kind });
  };

  const onNext = () => {
    if (!signup.contractorKind) return;
    const path = googleSignupToken ? `/signup?googleSignupToken=${encodeURIComponent(googleSignupToken)}` : `/signup`;
    router.push(path);
  };

  const isSelected = (kind: TContractorKind) => signup.contractorKind === kind;

  useEffect(() => {
    // Guard: user must have chosen ACCOUNT_TYPE.CONTRACTOR
    if (signup.accountType !== ACCOUNT_TYPE.CONTRACTOR) {
      router.replace(`/signup/start`);
    }

    if (signup.contractorKind === null && signup.accountType === ACCOUNT_TYPE.CONTRACTOR) {
      updateSignup({ contractorKind: CONTRACTOR_KIND.INDIVIDUAL });
    }
  }, [signup.accountType, signup.contractorKind, updateSignup, router]);
  if (!signup.accountType) return null;

  return (
    <div className={signupStartPageContainer} data-testid="consumer-signup-contractor-kind-page">
      <div className={signupStartCard}>
        <div className={signupStartHeader}>
          <h2 className={signupStartSubtitle}>Great! Now choose what type of contractor you are</h2>
          <h1 className={signupStartTitle}>I`m an</h1>
        </div>

        <div className={signupStartOptions} data-testid="consumer-signup-contractor-kind-options">
          <button
            type="button"
            data-testid="consumer-signup-contractor-kind-option-individual"
            onClick={(e) => (e.preventDefault(), e.stopPropagation(), selectKind(CONTRACTOR_KIND.INDIVIDUAL))}
            className={`${signupStartOptionBase} ${
              isSelected(CONTRACTOR_KIND.INDIVIDUAL) ? signupStartOptionActive : signupStartOptionInactive
            }`}
          >
            <div className={signupStartOptionEmoji}>👤</div>
            <div
              className={`${signupStartOptionLabelBase} ${
                isSelected(CONTRACTOR_KIND.INDIVIDUAL) ? signupStartOptionLabelActive : signupStartOptionLabelInactive
              }`}
            >
              INDIVIDUAL
            </div>
          </button>

          <button
            type="button"
            data-testid="consumer-signup-contractor-kind-option-entity"
            onClick={(e) => (e.preventDefault(), e.stopPropagation(), selectKind(CONTRACTOR_KIND.ENTITY))}
            className={`${signupStartOptionBase} ${
              isSelected(CONTRACTOR_KIND.ENTITY) ? signupStartOptionActive : signupStartOptionInactive
            }`}
          >
            <div className={signupStartOptionEmoji}>🏢</div>
            <div
              className={`${signupStartOptionLabelBase} ${
                isSelected(CONTRACTOR_KIND.ENTITY) ? signupStartOptionLabelActive : signupStartOptionLabelInactive
              }`}
            >
              ENTITY
            </div>
          </button>
        </div>

        {/* Description (optional, but matching previous screen style) */}
        {signup.contractorKind === CONTRACTOR_KIND.INDIVIDUAL && (
          <div className={signupStartInfo}>
            <div className={signupStartInfoTitle}>As an individual contractor you can:</div>
            <ul className={signupStartList}>
              <li>Work with global clients</li>
              <li>Get paid faster</li>
              <li>Track all invoices in one place</li>
              <li>Manage your freelance career</li>
            </ul>
          </div>
        )}

        {signup.contractorKind === CONTRACTOR_KIND.ENTITY && (
          <div className={signupStartInfo}>
            <div className={signupStartInfoTitle}>As an entity contractor you can:</div>
            <ul className={signupStartList}>
              <li>Manage your company’s invoices</li>
              <li>Assign roles and collaborate</li>
              <li>Work with verified businesses</li>
              <li>Grow your client base</li>
            </ul>
          </div>
        )}

        <button
          data-testid="consumer-signup-contractor-kind-btn-next"
          disabled={!signup.contractorKind}
          onClick={onNext}
          className={signupStartNextButton}
        >
          Next
        </button>

        <button
          data-testid="consumer-signup-contractor-kind-btn-back"
          onClick={(e) => (e.preventDefault(), e.stopPropagation(), router.push(`/signup/start`))}
          className={signupStartBackButton}
          type="button"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
