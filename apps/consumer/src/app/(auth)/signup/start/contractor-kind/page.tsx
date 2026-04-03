'use client';

import { useRouter } from 'next/navigation';

import { ACCOUNT_TYPE, CONTRACTOR_KIND, type TContractorKind } from '@remoola/api-types';
import { cn } from '@remoola/ui';

import styles from '../../../../../components/ui/classNames.module.css';
import { useSignupForm } from '../../hooks';
import { buildSignupFlowPath } from '../../routing';

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
    const path = buildSignupFlowPath(`/signup`, {
      accountType: signup.accountType,
      contractorKind: signup.contractorKind,
      googleSignupToken,
    });
    router.push(path);
  };

  const isSelected = (kind: TContractorKind) => signup.contractorKind === kind;
  const getOptionClassName = (selected: boolean) =>
    cn(signupStartOptionBase, selected ? signupStartOptionActive : signupStartOptionInactive);
  const getOptionLabelClassName = (selected: boolean) =>
    cn(signupStartOptionLabelBase, selected ? signupStartOptionLabelActive : signupStartOptionLabelInactive);

  if (signup.accountType !== ACCOUNT_TYPE.CONTRACTOR) {
    router.replace(`/signup/start`);
    return null;
  }

  if (!signup.accountType) return null;

  return (
    <div className={signupStartPageContainer} data-testid="consumer-signup-contractor-kind-page">
      <div className={signupStartCard}>
        <div className={signupStartHeader}>
          <p className={signupStartSubtitle}>Great. Now choose what type of contractor you are.</p>
          <h1 className={signupStartTitle}>I&apos;m an</h1>
        </div>

        <div className={signupStartOptions} data-testid="consumer-signup-contractor-kind-options">
          <button
            type="button"
            data-testid="consumer-signup-contractor-kind-option-individual"
            onClick={(e) => (e.preventDefault(), e.stopPropagation(), selectKind(CONTRACTOR_KIND.INDIVIDUAL))}
            className={getOptionClassName(isSelected(CONTRACTOR_KIND.INDIVIDUAL))}
          >
            <div className={signupStartOptionEmoji}>👤</div>
            <div className={getOptionLabelClassName(isSelected(CONTRACTOR_KIND.INDIVIDUAL))}>INDIVIDUAL</div>
          </button>

          <button
            type="button"
            data-testid="consumer-signup-contractor-kind-option-entity"
            onClick={(e) => (e.preventDefault(), e.stopPropagation(), selectKind(CONTRACTOR_KIND.ENTITY))}
            className={getOptionClassName(isSelected(CONTRACTOR_KIND.ENTITY))}
          >
            <div className={signupStartOptionEmoji}>🏢</div>
            <div className={getOptionLabelClassName(isSelected(CONTRACTOR_KIND.ENTITY))}>ENTITY</div>
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
          onClick={(e) => (
            e.preventDefault(),
            e.stopPropagation(),
            router.push(
              buildSignupFlowPath(`/signup/start`, {
                accountType: signup.accountType,
                contractorKind: null,
                googleSignupToken,
              }),
            )
          )}
          className={signupStartBackButton}
          type="button"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
