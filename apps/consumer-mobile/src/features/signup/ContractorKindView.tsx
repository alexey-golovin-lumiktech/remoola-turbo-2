'use client';

import { useRouter } from 'next/navigation';

import { ACCOUNT_TYPE, CONTRACTOR_KIND, type TContractorKind } from '@remoola/api-types';
import { LandmarkIcon, UserIcon } from '@remoola/ui';

import styles from './ContractorKindView.module.css';
import { buildSignupFlowPath } from './routing';
import { useSignupForm } from './SignupFormContext';

export function ContractorKindView() {
  const router = useRouter();
  const { signupDetails, updateSignup, googleSignupToken } = useSignupForm();

  if (signupDetails.accountType !== ACCOUNT_TYPE.CONTRACTOR) {
    router.replace(`/signup/start`);
    return null;
  }

  const selectKind = (kind: TContractorKind) => {
    updateSignup({ contractorKind: kind });
  };

  const onNext = () => {
    if (!signupDetails.contractorKind) return;
    router.push(
      buildSignupFlowPath(`/signup`, {
        accountType: signupDetails.accountType,
        contractorKind: signupDetails.contractorKind,
        googleSignupToken,
      }),
    );
  };

  const onBack = () => {
    router.push(
      buildSignupFlowPath(`/signup/start`, {
        accountType: signupDetails.accountType,
        contractorKind: null,
        googleSignupToken,
      }),
    );
  };

  const isSelected = (kind: TContractorKind) => signupDetails.contractorKind === kind;

  if (!signupDetails.accountType) return null;

  return (
    <div className={styles.root} data-testid="consumer-signup-contractor-kind-page">
      <div className={styles.card}>
        <p className={styles.stepLabel}>Choose contractor type</p>
        <h1 className={styles.stepTitle}>I&apos;m an</h1>
        <div className={styles.options} data-testid="consumer-signup-contractor-kind-options">
          <button
            type="button"
            data-testid="consumer-signup-contractor-kind-option-individual"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              selectKind(CONTRACTOR_KIND.INDIVIDUAL);
            }}
            className={`${styles.optionBtn} ${isSelected(CONTRACTOR_KIND.INDIVIDUAL) ? styles.optionBtnSelected : styles.optionBtnUnselected}`}
          >
            <span
              className={
                isSelected(CONTRACTOR_KIND.INDIVIDUAL) ? styles.optionIconSelected : styles.optionIconUnselected
              }
            >
              <UserIcon size={28} />
            </span>
            <span
              className={
                isSelected(CONTRACTOR_KIND.INDIVIDUAL) ? styles.optionTitleSelected : styles.optionTitleUnselected
              }
            >
              Individual
            </span>
          </button>
          <button
            type="button"
            data-testid="consumer-signup-contractor-kind-option-entity"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              selectKind(CONTRACTOR_KIND.ENTITY);
            }}
            className={`${styles.optionBtn} ${isSelected(CONTRACTOR_KIND.ENTITY) ? styles.optionBtnSelected : styles.optionBtnUnselected}`}
          >
            <span
              className={isSelected(CONTRACTOR_KIND.ENTITY) ? styles.optionIconSelected : styles.optionIconUnselected}
            >
              <LandmarkIcon size={28} />
            </span>
            <span
              className={isSelected(CONTRACTOR_KIND.ENTITY) ? styles.optionTitleSelected : styles.optionTitleUnselected}
            >
              Entity
            </span>
          </button>
        </div>
        <button
          type="button"
          data-testid="consumer-signup-contractor-kind-btn-next"
          disabled={!signupDetails.contractorKind}
          onClick={onNext}
          className={styles.nextBtn}
        >
          Next
        </button>
        <button
          type="button"
          data-testid="consumer-signup-contractor-kind-btn-back"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onBack();
          }}
          className={styles.backBtn}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
