/* eslint-disable max-len */
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-xl space-y-8 text-center">
        <div className="space-y-1">
        <h2 className="text-sm text-gray-500 dark:text-gray-400">Let`s find the right account for your needs</h2>
          <h1 className="text-3xl font-semibold">I`m a</h1>
        </div>

        <div className="flex gap-5 justify-center">
          <button
            type="button"
            onClick={() => selectType(ACCOUNT_TYPE.BUSINESS)}
            className={`
              flex h-40 w-40 flex-col items-center justify-center rounded-xl border
              transition-all
              ${
                isSelected(ACCOUNT_TYPE.BUSINESS)
                  ? `border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-sm`
                  : `border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700`
              }
            `}
          >
            <div className="text-4xl mb-2">📄</div>
            <div
              className={`text-sm font-semibold ${
                isSelected(ACCOUNT_TYPE.BUSINESS)
                  ? `text-blue-700 dark:text-blue-300`
                  : `text-gray-700 dark:text-gray-300`
              }`}
            >
              BUSINESS
            </div>
          </button>

          <button
            type="button"
            onClick={() => selectType(ACCOUNT_TYPE.CONTRACTOR)}
            className={`
              flex h-40 w-40 flex-col items-center justify-center rounded-xl border
              transition-all
              ${
                isSelected(ACCOUNT_TYPE.CONTRACTOR)
                  ? `border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-sm`
                  : `border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700`
              }
            `}
          >
            <div className="text-4xl mb-2">🏠</div>
            <div
              className={`text-sm font-semibold ${
                isSelected(ACCOUNT_TYPE.CONTRACTOR)
                  ? `text-blue-700 dark:text-blue-300`
                  : `text-gray-700 dark:text-gray-300`
              }`}
            >
              CONTRACTOR
            </div>
          </button>
        </div>

        {/* === Helpful Description (only when contractor selected) === */}
        {signup.accountType === ACCOUNT_TYPE.CONTRACTOR && (
          <div className="text-left text-sm text-gray-600 dark:text-gray-300 mx-auto max-w-sm space-y-1">
            <div className="font-medium">Sign up as a contractor to:</div>
            <ul className="list-disc list-inside space-y-1">
              <li>Get paid faster with automated invoicing</li>
              <li>Work with verified businesses worldwide</li>
              <li>Manage all your clients in one place</li>
              <li>…and grow your freelance career</li>
            </ul>
          </div>
        )}

        {signup.accountType === ACCOUNT_TYPE.BUSINESS && (
          <div className="text-left text-sm text-gray-600 dark:text-gray-300 mx-auto max-w-sm space-y-1">
            <div className="font-medium">Sign up as a contractor to:</div>
            <ul className="list-disc list-inside space-y-1">
              <li>Work compliantly from 150+ countries</li>
              <li>Automate your invoicing for every client</li>
              <li>Avoid transfer fees with 7+ payment options</li>
              <li>...other business pros</li>
            </ul>
          </div>
        )}

        <button
          disabled={!signup.accountType}
          onClick={onNext}
          className="w-full rounded-lg bg-blue-600 px-5 py-3 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
