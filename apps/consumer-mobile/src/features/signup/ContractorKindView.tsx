'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { ACCOUNT_TYPE, CONTRACTOR_KIND, type TContractorKind } from '@remoola/api-types';
import { LandmarkIcon, UserIcon } from '@remoola/ui';

import { useSignupForm } from './SignupFormContext';

export function ContractorKindView() {
  const router = useRouter();
  const { signupDetails, updateSignup, googleSignupToken } = useSignupForm();

  useEffect(() => {
    if (signupDetails.accountType !== ACCOUNT_TYPE.CONTRACTOR) {
      router.replace(`/signup/start`);
    }
    if (signupDetails.contractorKind === null && signupDetails.accountType === ACCOUNT_TYPE.CONTRACTOR) {
      updateSignup({ contractorKind: CONTRACTOR_KIND.INDIVIDUAL });
    }
  }, [signupDetails.accountType, signupDetails.contractorKind, updateSignup, router]);

  const selectKind = (kind: TContractorKind) => {
    updateSignup({ contractorKind: kind });
  };

  const onNext = () => {
    if (!signupDetails.contractorKind) return;
    const q = googleSignupToken ? `?googleSignupToken=${encodeURIComponent(googleSignupToken)}` : ``;
    router.push(`/signup${q}`);
  };

  const onBack = () => {
    router.push(`/signup/start`);
  };

  const isSelected = (kind: TContractorKind) => signupDetails.contractorKind === kind;

  if (!signupDetails.accountType) return null;

  return (
    <div
      className={`
        mx-auto
        max-w-md
        space-y-4
        px-3
        py-4
        sm:space-y-6
        sm:px-4
      `}
      data-testid="consumer-signup-contractor-kind-page"
    >
      <div
        className={`
        rounded-xl
        border
        border-neutral-200
        bg-white
        p-4
        shadow-xs
        sm:p-6
        dark:border-neutral-700
        dark:bg-neutral-900
      `}
      >
        <p
          className={`
          text-sm
          font-medium
          text-neutral-500
          dark:text-neutral-400
        `}
        >
          Choose contractor type
        </p>
        <h1
          className={`
          mt-1
          text-xl
          font-semibold
          text-neutral-900
          dark:text-white
        `}
        >
          I&apos;m an
        </h1>
        <div
          className={`
          mt-6
          flex
          flex-col
          gap-3
        `}
          data-testid="consumer-signup-contractor-kind-options"
        >
          <button
            type="button"
            data-testid="consumer-signup-contractor-kind-option-individual"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              selectKind(CONTRACTOR_KIND.INDIVIDUAL);
            }}
            className={`flex min-h-13 items-center gap-4 rounded-xl border-2 px-4 py-3 text-left transition focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
              isSelected(CONTRACTOR_KIND.INDIVIDUAL)
                ? `border-primary-500 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-400`
                : `border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:border-neutral-500`
            }`}
          >
            <span
              className={
                isSelected(CONTRACTOR_KIND.INDIVIDUAL)
                  ? `text-primary-600 dark:text-primary-400`
                  : `text-neutral-500 dark:text-neutral-400`
              }
            >
              <UserIcon size={28} />
            </span>
            <span
              className={`font-semibold ${
                isSelected(CONTRACTOR_KIND.INDIVIDUAL)
                  ? `text-primary-700 dark:text-primary-300`
                  : `text-neutral-700 dark:text-neutral-200`
              }`}
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
            className={`flex min-h-13 items-center gap-4 rounded-xl border-2 px-4 py-3 text-left transition focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
              isSelected(CONTRACTOR_KIND.ENTITY)
                ? `border-primary-500 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-400`
                : `border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:border-neutral-500`
            }`}
          >
            <span
              className={
                isSelected(CONTRACTOR_KIND.ENTITY)
                  ? `text-primary-600 dark:text-primary-400`
                  : `text-neutral-500 dark:text-neutral-400`
              }
            >
              <LandmarkIcon size={28} />
            </span>
            <span
              className={`font-semibold ${
                isSelected(CONTRACTOR_KIND.ENTITY)
                  ? `text-primary-700 dark:text-primary-300`
                  : `text-neutral-700 dark:text-neutral-200`
              }`}
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
          className={`
            mt-6
            min-h-11
            w-full
            rounded-xl
            bg-primary-600
            px-4
            py-3
            font-semibold
            text-white
            hover:bg-primary-700
            focus:outline-hidden
            focus:ring-2
            focus:ring-primary-500
            focus:ring-offset-2
            disabled:opacity-50
            dark:bg-primary-500
            dark:hover:bg-primary-600
          `}
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
          className={`
            mt-3
            min-h-11
            w-full
            rounded-xl
            border
            border-neutral-300
            px-4
            py-3
            font-medium
            text-neutral-700
            hover:bg-neutral-50
            focus:outline-hidden
            focus:ring-2
            focus:ring-primary-500
            focus:ring-offset-2
            dark:border-neutral-600
            dark:hover:bg-neutral-800
            dark:text-neutral-200
          `}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
