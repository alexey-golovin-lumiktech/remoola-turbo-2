/* eslint-disable max-len */
'use client';

import { useSignupSteps } from '../../context/SignupStepsContext';
import { useSignupForm } from '../../hooks/useSignupForm';
import { ACCOUNT_TYPE, CONTRACTOR_KIND } from '../../types/account.types';
import { STEP_NAME } from '../../types/step.types';
import { generatePassword } from '../../utils/passwordGenerator';
import { PasswordInput } from '../PasswordInput';
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

      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700">How Did You Hear About Us?</label>

        <div className="relative">
          <select
            value={signup.howDidHearAboutUs ?? ``}
            onChange={(e) => {
              const value = e.target.value || null;
              updateSignup({
                howDidHearAboutUs: value,
                howDidHearAboutUsOther: null, // reset
              });
            }}
            className="w-full rounded-md border px-3 py-2 text-sm bg-white"
          >
            <option value="">Not Selected</option>
            <option value="Employer Company">Employer Company</option>
            <option value="Employee Contractor">Employee Contractor</option>
            <option value="Referred Recommended">Referred Recommended</option>
            <option value="Email Invite">Email Invite</option>
            <option value="Google">Google</option>
            <option value="Facebook">Facebook</option>
            <option value="Twitter">Twitter</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="Other">Other</option>
          </select>

          {signup.howDidHearAboutUs && (
            <button
              type="button"
              onClick={() =>
                updateSignup({
                  howDidHearAboutUs: null,
                  howDidHearAboutUsOther: null,
                })
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-lg"
            >
              ×
            </button>
          )}
        </div>

        {/* If “Other” selected → show input */}
        {signup.howDidHearAboutUs === `Other` && (
          <div>
            <input
              type="text"
              value={signup.howDidHearAboutUsOther ?? ``}
              onChange={(e) => updateSignup({ howDidHearAboutUsOther: e.target.value })}
              placeholder="Explain how did you hear about us..."
              className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>

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
