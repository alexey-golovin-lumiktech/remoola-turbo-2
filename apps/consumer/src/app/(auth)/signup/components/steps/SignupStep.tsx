/* eslint-disable max-len */
'use client';

import { PasswordInput } from '@remoola/ui/PasswordInput';
import { SelectWithClear } from '@remoola/ui/SelectWithClear';

import { type IHowDidHearAboutUs, HOW_DID_HEAR_ABOUT_US } from '../../context/signup';
import { useSignupSteps } from '../../context/SignupStepsContext';
import { useSignupForm } from '../../hooks/useSignupForm';
import { ACCOUNT_TYPE, CONTRACTOR_KIND } from '../../types/account.types';
import { STEP_NAME } from '../../types/step.types';
import { generatePassword } from '../../utils/passwordGenerator';
import { PrevNextButtons } from '../PrevNextButtons';

export function SignupStep() {
  const { signup, updateSignup } = useSignupForm();
  const { markSubmitted, goNext } = useSignupSteps();

  const handleSubmit = () => {
    markSubmitted(STEP_NAME.SIGNUP);
    goNext();
  };

  return (
    <div className="w-full max-w-md space-y-4 rounded bg-white p-6 shadow-sm">
      {/* <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-xl border bg-white p-6 shadow-sm"> */}
      <h1 className="mb-1 text-xl font-semibold">Create your account</h1>
      <p className="mb-4 text-sm text-gray-600">Start by entering your basic account details.</p>

      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700">Email</label>
        <input
          type="email"
          value={signup.email}
          onChange={(e) => updateSignup({ email: e.target.value })}
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder="you@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700">Password</label>

        <div className="flex gap-2">
          <div className="flex-1">
            <PasswordInput
              value={signup.password}
              onChange={(value) => updateSignup({ password: value })}
              placeholder="Enter password"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              const pwd = generatePassword(12);
              updateSignup({ password: pwd, confirmPassword: pwd });
            }}
            className="whitespace-nowrap rounded-md border border-blue-600 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            Generate
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700">Confirm password</label>
        <PasswordInput
          value={signup.confirmPassword}
          onChange={(value) => updateSignup({ confirmPassword: value })}
          placeholder="Confirm password"
        />
      </div>

      <SelectWithClear<IHowDidHearAboutUs | string>
        label="How Did You Hear About Us?"
        value={signup.howDidHearAboutUs || ``}
        onChange={(howDidHearAboutUs) => updateSignup({ howDidHearAboutUs })}
        options={[
          { label: HOW_DID_HEAR_ABOUT_US.EMPLOYER_COMPANY, value: HOW_DID_HEAR_ABOUT_US.EMPLOYER_COMPANY },
          { label: HOW_DID_HEAR_ABOUT_US.EMPLOYEE_CONTRACTOR, value: HOW_DID_HEAR_ABOUT_US.EMPLOYEE_CONTRACTOR },
          { label: HOW_DID_HEAR_ABOUT_US.REFERRED_RECOMMENDED, value: HOW_DID_HEAR_ABOUT_US.REFERRED_RECOMMENDED },
          { label: HOW_DID_HEAR_ABOUT_US.EMAIL_INVITE, value: HOW_DID_HEAR_ABOUT_US.EMAIL_INVITE },
          { label: HOW_DID_HEAR_ABOUT_US.GOOGLE, value: HOW_DID_HEAR_ABOUT_US.GOOGLE },
          { label: HOW_DID_HEAR_ABOUT_US.FACEBOOK, value: HOW_DID_HEAR_ABOUT_US.FACEBOOK },
          { label: HOW_DID_HEAR_ABOUT_US.TWITTER, value: HOW_DID_HEAR_ABOUT_US.TWITTER },
          { label: HOW_DID_HEAR_ABOUT_US.LINKED_IN, value: HOW_DID_HEAR_ABOUT_US.LINKED_IN },
        ]}
        showOtherField
        showNotSelected={false}
        otherValue={signup.howDidHearAboutUsOther}
        onChangeOther={(howDidHearAboutUsOther) => updateSignup({ howDidHearAboutUsOther })}
      />

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700">Account type</label>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() =>
              updateSignup({
                accountType: ACCOUNT_TYPE.BUSINESS,
                contractorKind: CONTRACTOR_KIND.INDIVIDUAL, // reset
              })
            }
            className={`flex-1 rounded-md border px-3 py-2 text-center text-sm
              ${
                signup.accountType === ACCOUNT_TYPE.BUSINESS
                  ? `border-blue-600 bg-blue-50 text-blue-700`
                  : `border-gray-300 text-gray-700`
              }`}
          >
            Business
          </button>

          <button
            type="button"
            onClick={() =>
              updateSignup({
                accountType: ACCOUNT_TYPE.CONTRACTOR,
                contractorKind: signup.contractorKind ?? CONTRACTOR_KIND.INDIVIDUAL,
              })
            }
            className={`flex-1 rounded-md border px-3 py-2 text-center text-sm
              ${
                signup.accountType === ACCOUNT_TYPE.CONTRACTOR
                  ? `border-blue-600 bg-blue-50 text-blue-700`
                  : `border-gray-300 text-gray-700`
              }`}
          >
            Contractor
          </button>
        </div>
      </div>

      {/* Contractor kind (ONLY if contractor) */}
      {signup.accountType === ACCOUNT_TYPE.CONTRACTOR && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-700">Contractor kind</label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => updateSignup({ contractorKind: CONTRACTOR_KIND.INDIVIDUAL })}
              className={`flex-1 rounded-md border px-3 py-2 text-center text-sm
                ${
                  signup.contractorKind === CONTRACTOR_KIND.INDIVIDUAL
                    ? `border-blue-600 bg-blue-50 text-blue-700`
                    : `border-gray-300 text-gray-700`
                }`}
            >
              Individual
            </button>

            <button
              type="button"
              onClick={() => updateSignup({ contractorKind: CONTRACTOR_KIND.ENTITY })}
              className={`flex-1 rounded-md border px-3 py-2 text-center text-sm
                ${
                  signup.contractorKind === CONTRACTOR_KIND.ENTITY
                    ? `border-blue-600 bg-blue-50 text-blue-700`
                    : `border-gray-300 text-gray-700`
                }`}
            >
              Entity
            </button>
          </div>
        </div>
      )}

      <PrevNextButtons nextLabel="Continue" onClick={() => handleSubmit()} />
      {/* </form> */}
    </div>
  );
}
