'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { ACCOUNT_TYPE, CONTRACTOR_KIND, type TContractorKind } from '@remoola/api-types';
import { LandmarkIcon, UserIcon } from '@remoola/ui';

import styles from './ContractorKindView.module.css';
import { buildSignupFlowPath } from './routing';
import { useSignupForm } from './SignupFormContext';

export function ContractorKindView() {
  const router = useRouter();
  const { signupDetails, updateSignup, googleSignupToken } = useSignupForm();

  useEffect(() => {
    if (signupDetails.accountType !== ACCOUNT_TYPE.CONTRACTOR) {
      router.replace(
        buildSignupFlowPath(`/signup/start`, {
          accountType: signupDetails.accountType,
          contractorKind: signupDetails.contractorKind,
          googleSignupToken,
        }),
      );
    }
  }, [signupDetails.accountType, signupDetails.contractorKind, googleSignupToken, router]);

  const selectKind = (kind: TContractorKind) => {
    updateSignup({ contractorKind: kind });
  };

  const onNext = () => {
    if (!signupDetails.contractorKind) return;
    router.push(
      buildSignupFlowPath(`/signup`, {
        accountType: ACCOUNT_TYPE.CONTRACTOR,
        contractorKind: signupDetails.contractorKind,
        googleSignupToken,
      }),
    );
  };

  const isSelected = (kind: TContractorKind) => signupDetails.contractorKind === kind;

  if (signupDetails.accountType !== ACCOUNT_TYPE.CONTRACTOR) {
    return null;
  }

  return (
    <div className={styles.root}>
      <div className={styles.shell}>
        <div className={styles.panel}>
          <div className={styles.header}>
            <p className={styles.eyebrow}>Contractor setup</p>
            <h1 className={styles.title}>How are you signing up?</h1>
            <p className={styles.subtitle}>
              Choose the contractor structure so we can ask for the right legal and organization details next.
            </p>
          </div>

          <div className={styles.options}>
            <button
              type="button"
              onClick={() => selectKind(CONTRACTOR_KIND.INDIVIDUAL)}
              className={`${styles.optionBtn} ${
                isSelected(CONTRACTOR_KIND.INDIVIDUAL) ? styles.optionBtnSelected : styles.optionBtnUnselected
              }`}
              data-testid="consumer-css-grid-signup-kind-individual"
            >
              <div className={styles.iconWrap}>
                <UserIcon size={28} />
              </div>
              <p className={styles.optionTitle}>Individual contractor</p>
              <p className={styles.optionText}>
                For sole professionals onboarding under their own identity and personal tax details.
              </p>
            </button>

            <button
              type="button"
              onClick={() => selectKind(CONTRACTOR_KIND.ENTITY)}
              className={`${styles.optionBtn} ${
                isSelected(CONTRACTOR_KIND.ENTITY) ? styles.optionBtnSelected : styles.optionBtnUnselected
              }`}
              data-testid="consumer-css-grid-signup-kind-entity"
            >
              <div className={styles.iconWrap}>
                <LandmarkIcon size={28} />
              </div>
              <p className={styles.optionTitle}>Contractor entity</p>
              <p className={styles.optionText}>
                For incorporated contractors that need entity-level tax, legal address, and organization details.
              </p>
            </button>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onNext}
              className={styles.primaryBtn}
              disabled={!signupDetails.contractorKind}
            >
              Continue
            </button>
            <button
              type="button"
              onClick={() =>
                router.push(
                  buildSignupFlowPath(`/signup/start`, {
                    accountType: ACCOUNT_TYPE.CONTRACTOR,
                    contractorKind: signupDetails.contractorKind,
                    googleSignupToken,
                  }),
                )
              }
              className={styles.secondaryBtn}
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
