'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ACCOUNT_TYPE,
  HOW_DID_HEAR_ABOUT_US,
  HOW_DID_HEAR_ABOUT_US_VALUES,
  type THowDidHearAboutUs,
} from '@remoola/api-types';
import { GoogleIcon, PasswordInput } from '@remoola/ui';

import { getApiBaseUrlOptional } from '../../../../lib/config.client';
import { getLocalToastMessage, localToastKeys } from '../../../../lib/error-messages';
import { showErrorToast } from '../../../../lib/toast.client';
import { CheckCircleIcon } from '../../../../shared/ui/icons/CheckCircleIcon';
import { ExclamationCircleIcon } from '../../../../shared/ui/icons/ExclamationCircleIcon';
import { InformationCircleIcon } from '../../../../shared/ui/icons/InformationCircleIcon';
import { useSignupForm } from '../../SignupFormContext';
import { useSignupSteps } from '../../SignupStepsContext';
import { STEP_NAME } from '../../stepNames';
import { createSignupDetailsSchema, getFieldErrors } from '../../validation';
import { SIGNUP_INPUT_CLASS } from '../inputClass';
import { PrevNextButtons } from '../PrevNextButtons';

const HOW_LABEL: Record<string, string> = {
  [HOW_DID_HEAR_ABOUT_US.GOOGLE]: `Google`,
  [HOW_DID_HEAR_ABOUT_US.FACEBOOK]: `Facebook`,
  [HOW_DID_HEAR_ABOUT_US.TWITTER]: `Twitter`,
  [HOW_DID_HEAR_ABOUT_US.LINKED_IN]: `LinkedIn`,
  [HOW_DID_HEAR_ABOUT_US.REFERRED_RECOMMENDED]: `Referred / Recommended`,
  [HOW_DID_HEAR_ABOUT_US.EMAIL_INVITE]: `Email invite`,
  [HOW_DID_HEAR_ABOUT_US.EMPLOYER_COMPANY]: `Employer / Company`,
  [HOW_DID_HEAR_ABOUT_US.EMPLOYEE_CONTRACTOR]: `Employee / Contractor`,
  [HOW_DID_HEAR_ABOUT_US.OTHER]: `Other`,
};

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: ``, color: `` };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: `Weak`, color: `text-red-600 dark:text-red-400` };
  if (score <= 3) return { score, label: `Fair`, color: `text-amber-600 dark:text-amber-400` };
  if (score <= 4) return { score, label: `Good`, color: `text-green-600 dark:text-green-400` };
  return { score, label: `Strong`, color: `text-green-700 dark:text-green-300` };
}

export function SignupDetailsStep() {
  const params = useSearchParams();
  const googleToken = params.get(`googleSignupToken`);
  const { signupDetails, updateSignup, googleSignupToken } = useSignupForm();
  const token = googleSignupToken ?? googleToken;
  const isGoogleSignup = Boolean(token);
  const { markSubmitted, goNext } = useSignupSteps();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const emailInputRef = useRef<HTMLInputElement>(null);

  const passwordStrength = useMemo(() => getPasswordStrength(signupDetails.password), [signupDetails.password]);

  useEffect(() => {
    if (!isGoogleSignup) {
      emailInputRef.current?.focus();
    }
  }, [isGoogleSignup]);

  const googleSignupStartUrl = useMemo(() => {
    const base = getApiBaseUrlOptional();
    if (!base) return null;
    if (typeof window === `undefined`) return null;
    const url = new URL(`${base}/consumer/auth/google/start`);
    url.searchParams.set(`next`, `/signup`);
    url.searchParams.set(`returnOrigin`, window.location.origin);
    if (signupDetails.accountType) url.searchParams.set(`accountType`, signupDetails.accountType);
    if (signupDetails.accountType === ACCOUNT_TYPE.CONTRACTOR && signupDetails.contractorKind) {
      url.searchParams.set(`contractorKind`, signupDetails.contractorKind);
    }
    return url.toString();
  }, [signupDetails.accountType, signupDetails.contractorKind]);

  const validateField = useCallback(
    (field: string, value: string) => {
      const schema = createSignupDetailsSchema(isGoogleSignup);
      const result = schema.safeParse({ ...signupDetails, [field]: value });
      if (!result.success) {
        const errors = getFieldErrors(result.error);
        return errors[field];
      }
      return undefined;
    },
    [isGoogleSignup, signupDetails],
  );

  const handleNext = useCallback(() => {
    const schema = createSignupDetailsSchema(isGoogleSignup);
    const result = schema.safeParse(signupDetails);
    if (!result.success) {
      const fieldErrorsMap = getFieldErrors(result.error);
      setFieldErrors(fieldErrorsMap);
      if (Object.keys(fieldErrorsMap).length > 0) {
        showErrorToast(getLocalToastMessage(localToastKeys.VALIDATION_SIGNUP_DETAILS));
      }
      return;
    }
    setFieldErrors({});
    markSubmitted(STEP_NAME.SIGNUP_DETAILS);
    goNext();
  }, [isGoogleSignup, signupDetails, markSubmitted, goNext]);

  const handleEmailChange = (value: string) => {
    updateSignup({ email: value });
    if (touched.email) {
      const error = validateField(`email`, value);
      setFieldErrors((prev) => ({ ...prev, email: error ?? `` }));
    }
  };

  const handlePasswordChange = (value: string) => {
    updateSignup({ password: value });
    if (touched.password) {
      const error = validateField(`password`, value);
      setFieldErrors((prev) => ({ ...prev, password: error ?? `` }));
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    updateSignup({ confirmPassword: value });
    if (touched.confirmPassword) {
      const error = validateField(`confirmPassword`, value);
      setFieldErrors((prev) => ({ ...prev, confirmPassword: error ?? `` }));
    }
  };

  return (
    <div
      className={`
      rounded-xl
      border
      border-neutral-200
      bg-white
      shadow-xs
      dark:border-neutral-700
      dark:bg-neutral-900
    `}
    >
      <div className={`p-4 sm:p-6`}>
        <h1
          className={`
          mb-4
          text-lg
          font-semibold
          text-neutral-900
          dark:text-white
        `}
        >
          Signup details
        </h1>
        {!isGoogleSignup && (
          <>
            <div className={`mb-4`}>
              <label
                htmlFor="sd-email"
                className={`
                  mb-1.5
                  block
                  text-sm
                  font-medium
                  text-neutral-700
                  dark:text-neutral-300
                `}
              >
                Email address
              </label>
              <input
                ref={emailInputRef}
                id="sd-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={signupDetails.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={() => {
                  setTouched((prev) => ({ ...prev, email: true }));
                  const error = validateField(`email`, signupDetails.email);
                  if (error) setFieldErrors((prev) => ({ ...prev, email: error }));
                }}
                className={`${SIGNUP_INPUT_CLASS} ${fieldErrors.email ? `border-red-500 ring-2 ring-red-500/20` : ``}`}
                aria-invalid={!!fieldErrors.email || undefined}
                aria-describedby={fieldErrors.email ? `sd-email-err` : undefined}
              />
              {fieldErrors.email && (
                <p
                  id="sd-email-err"
                  className={`
                    mt-1.5
                    flex
                    items-center
                    gap-1
                    text-xs
                    text-red-600
                    dark:text-red-400
                  `}
                  role="alert"
                >
                  <ExclamationCircleIcon className={`h-4 w-4 shrink-0`} />
                  {fieldErrors.email}
                </p>
              )}
            </div>
            <div className={`mb-4`}>
              <label
                htmlFor="sd-password"
                className={`
                  mb-1.5
                  block
                  text-sm
                  font-medium
                  text-neutral-700
                  dark:text-neutral-300
                `}
              >
                Password
              </label>
              <PasswordInput
                name="sd-password"
                value={signupDetails.password}
                onChange={handlePasswordChange}
                placeholder="Create a strong password"
                inputClassName={
                  fieldErrors.password
                    ? SIGNUP_INPUT_CLASS + ` border-red-500 ring-2 ring-red-500/20`
                    : SIGNUP_INPUT_CLASS
                }
              />
              {signupDetails.password && (
                <div className={`mt-2`}>
                  <div className={`flex items-center justify-between`}>
                    <span className={`text-xs text-neutral-600 dark:text-neutral-400`}>Password strength:</span>
                    <span className={`text-xs font-medium ${passwordStrength.color}`}>{passwordStrength.label}</span>
                  </div>
                  <div className={`mt-1 flex gap-1`}>
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          i < passwordStrength.score
                            ? passwordStrength.score <= 1
                              ? `bg-red-500`
                              : passwordStrength.score <= 3
                                ? `bg-amber-500`
                                : `bg-green-500`
                            : `bg-neutral-200 dark:bg-neutral-700`
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
              {fieldErrors.password && (
                <p
                  id="sd-password-err"
                  className={`
                    mt-1.5
                    flex
                    items-center
                    gap-1
                    text-xs
                    text-red-600
                    dark:text-red-400
                  `}
                  role="alert"
                >
                  <ExclamationCircleIcon className={`h-4 w-4 shrink-0`} />
                  {fieldErrors.password}
                </p>
              )}
              <p
                className={`
                mt-1.5
                text-xs
                text-neutral-500
                dark:text-neutral-400
              `}
              >
                At least 8 characters with mixed case, numbers & symbols
              </p>
            </div>
            <div className={`mb-4`}>
              <label
                htmlFor="sd-confirm"
                className={`
                  mb-1.5
                  block
                  text-sm
                  font-medium
                  text-neutral-700
                  dark:text-neutral-300
                `}
              >
                Confirm password
              </label>
              <PasswordInput
                name="sd-confirm"
                value={signupDetails.confirmPassword}
                onChange={handleConfirmPasswordChange}
                placeholder="Re-enter your password"
                inputClassName={
                  fieldErrors.confirmPassword
                    ? SIGNUP_INPUT_CLASS + ` border-red-500 ring-2 ring-red-500/20`
                    : SIGNUP_INPUT_CLASS
                }
              />
              {signupDetails.confirmPassword && signupDetails.confirmPassword === signupDetails.password && (
                <p
                  className={`
                  mt-1.5
                  flex
                  items-center
                  gap-1
                  text-xs
                  text-green-600
                  dark:text-green-400
                `}
                >
                  <CheckCircleIcon className={`h-4 w-4 shrink-0`} />
                  Passwords match
                </p>
              )}
              {fieldErrors.confirmPassword && (
                <p
                  id="sd-confirm-err"
                  className={`
                    mt-1.5
                    flex
                    items-center
                    gap-1
                    text-xs
                    text-red-600
                    dark:text-red-400
                  `}
                  role="alert"
                >
                  <ExclamationCircleIcon className={`h-4 w-4 shrink-0`} />
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>
          </>
        )}
        {isGoogleSignup && signupDetails.email && (
          <div
            className={`
            mb-4
            rounded-lg
            bg-primary-50
            p-3
            dark:bg-primary-900/20
          `}
          >
            <p
              className={`
              flex
              items-center
              gap-2
              text-sm
              text-primary-700
              dark:text-primary-300
            `}
            >
              <InformationCircleIcon className={`h-5 w-5 shrink-0`} />
              Signing up with {signupDetails.email}
            </p>
          </div>
        )}
        {isGoogleSignup && googleSignupStartUrl && (
          <p
            className={`
            mb-4
            text-sm
            text-neutral-500
            dark:text-neutral-400
          `}
          >
            Google sign-up started. To use email/password instead, go back.
          </p>
        )}
        <div className={`mb-3`}>
          <label
            htmlFor="sd-how"
            className={`
            mb-1.5
            block
            text-sm
            font-medium
            text-neutral-700
            dark:text-neutral-300
          `}
          >
            How did you hear about us? <span className={`text-neutral-400`}>(Optional)</span>
          </label>
          <select
            id="sd-how"
            value={signupDetails.howDidHearAboutUs ?? ``}
            onChange={(e) => {
              const v = e.target.value;
              const howDidHearAboutUs = v ? (v as THowDidHearAboutUs) : null;
              const howDidHearAboutUsOther =
                howDidHearAboutUs !== HOW_DID_HEAR_ABOUT_US.OTHER ? null : signupDetails.howDidHearAboutUsOther;
              updateSignup({ howDidHearAboutUs, howDidHearAboutUsOther });
            }}
            className={SIGNUP_INPUT_CLASS}
          >
            <option value="" disabled>
              Select an option...
            </option>
            {HOW_DID_HEAR_ABOUT_US_VALUES.map((val) => (
              <option key={val} value={val}>
                {HOW_LABEL[val] ?? val}
              </option>
            ))}
          </select>
        </div>
        {signupDetails.howDidHearAboutUs === HOW_DID_HEAR_ABOUT_US.OTHER && (
          <div className={`mb-3`}>
            <label
              htmlFor="sd-how-other"
              className={`
                mb-1.5
                block
                text-sm
                font-medium
                text-neutral-700
                dark:text-neutral-300
              `}
            >
              How did you hear about us? (other)
            </label>
            <input
              id="sd-how-other"
              type="text"
              autoComplete="off"
              placeholder="Please specify"
              value={signupDetails.howDidHearAboutUsOther ?? ``}
              onChange={(e) => updateSignup({ howDidHearAboutUsOther: e.target.value })}
              className={SIGNUP_INPUT_CLASS}
            />
          </div>
        )}
      </div>
      <PrevNextButtons onNext={handleNext} />

      {googleSignupStartUrl && !isGoogleSignup && (
        <div
          className={`
          border-t
          border-neutral-200
          p-4
          dark:border-neutral-700
          sm:p-6
        `}
        >
          <div className={`relative mb-4`}>
            <div
              className={`
              absolute
              inset-0
              flex
              items-center
            `}
            >
              <div
                className={`
                w-full
                border-t
                border-neutral-200
                dark:border-neutral-700
              `}
              />
            </div>
            <div
              className={`
              relative
              flex
              justify-center
              text-xs
            `}
            >
              <span
                className={`
                bg-white
                px-3
                text-neutral-500
                dark:bg-neutral-900
                dark:text-neutral-400
              `}
              >
                Or sign up with
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              await fetch(`/api/consumer/auth/clear-cookies`, { method: `POST`, credentials: `include` });
              window.location.href = googleSignupStartUrl;
            }}
            className={
              `group relative min-h-12 w-full overflow-hidden rounded-xl border border-neutral-200 ` +
              `bg-white px-4 py-3 text-sm font-semibold text-neutral-700 shadow-xs transition-all ` +
              `hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-md ` +
              `focus:outline-hidden focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 ` +
              `dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-700`
            }
            data-testid="consumer-mobile-signup-google"
          >
            <span
              className={`
              flex
              items-center
              justify-center
              gap-3
            `}
            >
              <GoogleIcon size={20} />
              Sign up with Google
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
