/* eslint-disable max-len */
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useSignupForm } from '../../hooks/useSignupForm';
import { type IContractorKind, ACCOUNT_TYPE, CONTRACTOR_KIND } from '../../types';

export default function ChooseContractorKindStep() {
  const router = useRouter();
  const { signupDetails: signup, updateSignup } = useSignupForm();

  const selectKind = (kind: IContractorKind) => {
    updateSignup({ contractorKind: kind });
  };

  const onNext = () => {
    if (!signup.contractorKind) return;
    router.push(`/signup`);
  };

  const isSelected = (kind: IContractorKind) => signup.contractorKind === kind;

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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-xl space-y-8 text-center">
        <div className="space-y-1">
          <h2 className="text-sm text-gray-500">Great! Now choose what type of contractor you are</h2>
          <h1 className="text-3xl font-semibold">I`m an</h1>
        </div>

        <div className="flex gap-5 justify-center">
          <button
            type="button"
            onClick={() => selectKind(CONTRACTOR_KIND.INDIVIDUAL)}
            className={`
              flex h-40 w-40 flex-col items-center justify-center rounded-xl border
              transition-all
              ${
                isSelected(CONTRACTOR_KIND.INDIVIDUAL)
                  ? `border-blue-600 bg-blue-50 shadow-sm`
                  : `border-gray-300 bg-white hover:bg-gray-100`
              }
            `}
          >
            <div className="text-4xl mb-2">👤</div>
            <div
              className={`text-sm font-semibold ${
                isSelected(CONTRACTOR_KIND.INDIVIDUAL) ? `text-blue-700` : `text-gray-700`
              }`}
            >
              INDIVIDUAL
            </div>
          </button>

          <button
            type="button"
            onClick={() => selectKind(CONTRACTOR_KIND.ENTITY)}
            className={`
              flex h-40 w-40 flex-col items-center justify-center rounded-xl border
              transition-all
              ${
                isSelected(CONTRACTOR_KIND.ENTITY)
                  ? `border-blue-600 bg-blue-50 shadow-sm`
                  : `border-gray-300 bg-white hover:bg-gray-100`
              }
            `}
          >
            <div className="text-4xl mb-2">🏢</div>
            <div
              className={`text-sm font-semibold ${
                isSelected(CONTRACTOR_KIND.ENTITY) ? `text-blue-700` : `text-gray-700`
              }`}
            >
              ENTITY
            </div>
          </button>
        </div>

        {/* Description (optional, but matching previous screen style) */}
        {signup.contractorKind === CONTRACTOR_KIND.INDIVIDUAL && (
          <div className="text-left text-sm text-gray-600 mx-auto max-w-sm space-y-1">
            <div className="font-medium">As an individual contractor you can:</div>
            <ul className="list-disc list-inside space-y-1">
              <li>Work with global clients</li>
              <li>Get paid faster</li>
              <li>Track all invoices in one place</li>
              <li>Manage your freelance career</li>
            </ul>
          </div>
        )}

        {signup.contractorKind === CONTRACTOR_KIND.ENTITY && (
          <div className="text-left text-sm text-gray-600 mx-auto max-w-sm space-y-1">
            <div className="font-medium">As an entity contractor you can:</div>
            <ul className="list-disc list-inside space-y-1">
              <li>Manage your company’s invoices</li>
              <li>Assign roles and collaborate</li>
              <li>Work with verified businesses</li>
              <li>Grow your client base</li>
            </ul>
          </div>
        )}

        <button
          disabled={!signup.contractorKind}
          onClick={onNext}
          className="w-full rounded-lg bg-blue-600 px-5 py-3 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>

        <button
          onClick={() => router.push(`/signup/start`)}
          className="block w-full text-sm text-gray-500 mt-2 hover:underline"
          type="button"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
