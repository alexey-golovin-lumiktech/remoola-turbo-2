'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ACCOUNT_TYPE, HOW_DID_HEAR_ABOUT_US, HOW_DID_HEAR_ABOUT_US_VALUES } from '@remoola/api-types';
import { GoogleIcon, PasswordInput } from '@remoola/ui';

import { buildSignupFlowPath } from '../../routing';
import { useSignupForm } from '../../SignupFormContext';
import { useSignupSteps } from '../../SignupStepsContext';
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

type StrengthKey = `weak` | `fair` | `good` | `strong`;

function getPasswordStrength(password: string): { score: number; label: string; strengthKey: StrengthKey } {
  if (!password) return { score: 0, label: ``, strengthKey: `weak` };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: `Weak`, strengthKey: `weak` };
  if (score <= 3) return { score, label: `Fair`, strengthKey: `fair` };
  if (score <= 4) return { score, label: `Good`, strengthKey: `good` };
  return { score, label: `Strong`, strengthKey: `strong` };
}

const strengthClass: Record<StrengthKey, string> = {
  weak: `text-red-600 dark:text-red-400`,
  fair: `text-amber-600 dark:text-amber-400`,
  good: `text-sky-600 dark:text-sky-400`,
  strong: `text-emerald-600 dark:text-emerald-400`,
};

export function SignupDetailsStep() {
  const { signupDetails, updateSignup, googleSignupToken, googleHydrationLoading, googleHydrationError } =
    useSignupForm();
  const { markSubmitted, goNext } = useSignupSteps();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const emailInputRef = useRef<HTMLInputElement>(null);

  const isGoogleSignup = Boolean(googleSignupToken);
  const passwordStrength = useMemo(() => getPasswordStrength(signupDetails.password), [signupDetails.password]);

  useEffect(() => {
    if (!isGoogleSignup) {
      emailInputRef.current?.focus();
    }
  }, [isGoogleSignup]);

  const googleSignupStartUrl = useMemo(() => {
    if (typeof window === `undefined`) return null;
    const url = new URL(`/api/consumer/auth/google/start`, window.location.origin);
    url.searchParams.set(
      `next`,
      buildSignupFlowPath(`/signup`, {
        accountType: signupDetails.accountType,
        contractorKind: signupDetails.contractorKind,
        googleSignupToken: null,
      }),
    );
    url.searchParams.set(`signupPath`, window.location.pathname === `/signup` ? `/signup` : `/signup/start`);
    url.searchParams.set(`returnOrigin`, window.location.origin);
    if (signupDetails.accountType) url.searchParams.set(`accountType`, signupDetails.accountType);
    if (signupDetails.accountType === ACCOUNT_TYPE.CONTRACTOR && signupDetails.contractorKind) {
      url.searchParams.set(`contractorKind`, signupDetails.contractorKind);
    }
    return `${url.pathname}${url.search}`;
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
      setFieldErrors(getFieldErrors(result.error));
      return;
    }
    setFieldErrors({});
    markSubmitted(`signup_details`);
    goNext();
  }, [goNext, isGoogleSignup, markSubmitted, signupDetails]);

  return (
    <div className="overflow-hidden rounded-[28px]">
      <div className="grid gap-8 border-b border-slate-100 px-6 py-6 dark:border-slate-800 lg:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)] lg:px-8">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600 dark:text-primary-400">
              Step 1
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Account details</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              This is the identity layer of signup: account credentials, acquisition source, and Google handoff.
            </p>
          </div>

          {isGoogleSignup ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {googleHydrationLoading ? (
                <p>Loading your Google profile…</p>
              ) : googleHydrationError ? (
                <p>{googleHydrationError}</p>
              ) : (
                <p>Your Google account will be used to complete sign-up.</p>
              )}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="signup-email"
                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Email address
              </label>
              <input
                ref={emailInputRef}
                id="signup-email"
                type="email"
                autoComplete="email"
                value={signupDetails.email}
                onChange={(event) => updateSignup({ email: event.target.value })}
                onBlur={() => {
                  setTouched((current) => ({ ...current, email: true }));
                  const error = validateField(`email`, signupDetails.email);
                  setFieldErrors((current) => ({ ...current, email: error ?? `` }));
                }}
                className={`${SIGNUP_INPUT_CLASS} ${fieldErrors.email ? `border-red-500 ring-2 ring-red-500/20` : ``}`}
                placeholder="you@example.com"
                disabled={isGoogleSignup}
              />
              {fieldErrors.email ? (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.email}</p>
              ) : null}
            </div>

            {!isGoogleSignup ? (
              <>
                <div>
                  <label
                    htmlFor="signup-password"
                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Password
                  </label>
                  <PasswordInput
                    id="signup-password"
                    name="signup-password"
                    value={signupDetails.password}
                    onChange={(value) => {
                      updateSignup({ password: value });
                      if (touched.password) {
                        const error = validateField(`password`, value);
                        setFieldErrors((current) => ({ ...current, password: error ?? `` }));
                      }
                    }}
                    onBlur={() => {
                      setTouched((current) => ({ ...current, password: true }));
                      const error = validateField(`password`, signupDetails.password);
                      setFieldErrors((current) => ({ ...current, password: error ?? `` }));
                    }}
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    toggleAriaLabel="Toggle password visibility"
                    inputClassName={`${SIGNUP_INPUT_CLASS} ${fieldErrors.password ? `border-red-500 ring-2 ring-red-500/20` : ``}`}
                  />
                  {signupDetails.password ? (
                    <p className={`mt-2 text-xs font-medium ${strengthClass[passwordStrength.strengthKey]}`}>
                      Password strength: {passwordStrength.label}
                    </p>
                  ) : null}
                  {fieldErrors.password ? (
                    <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.password}</p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="signup-confirm-password"
                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Confirm password
                  </label>
                  <PasswordInput
                    id="signup-confirm-password"
                    name="signup-confirm-password"
                    value={signupDetails.confirmPassword}
                    onChange={(value) => {
                      updateSignup({ confirmPassword: value });
                      if (touched.confirmPassword) {
                        const error = validateField(`confirmPassword`, value);
                        setFieldErrors((current) => ({ ...current, confirmPassword: error ?? `` }));
                      }
                    }}
                    onBlur={() => {
                      setTouched((current) => ({ ...current, confirmPassword: true }));
                      const error = validateField(`confirmPassword`, signupDetails.confirmPassword);
                      setFieldErrors((current) => ({ ...current, confirmPassword: error ?? `` }));
                    }}
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    toggleAriaLabel="Toggle confirm password visibility"
                    inputClassName={`${SIGNUP_INPUT_CLASS} ${
                      fieldErrors.confirmPassword ? `border-red-500 ring-2 ring-red-500/20` : ``
                    }`}
                  />
                  {fieldErrors.confirmPassword ? (
                    <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.confirmPassword}</p>
                  ) : null}
                </div>
              </>
            ) : null}

            <div className="sm:col-span-2">
              <label htmlFor="signup-how" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                How did you hear about us? <span className="text-slate-400">(optional)</span>
              </label>
              <select
                id="signup-how"
                value={signupDetails.howDidHearAboutUs ?? ``}
                onChange={(event) => {
                  const value = event.target.value || null;
                  updateSignup({
                    howDidHearAboutUs: value as typeof signupDetails.howDidHearAboutUs,
                    howDidHearAboutUsOther:
                      value === HOW_DID_HEAR_ABOUT_US.OTHER ? signupDetails.howDidHearAboutUsOther : null,
                  });
                }}
                className={SIGNUP_INPUT_CLASS}
              >
                <option value="">Select an option…</option>
                {HOW_DID_HEAR_ABOUT_US_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {HOW_LABEL[value] ?? value}
                  </option>
                ))}
              </select>
            </div>

            {signupDetails.howDidHearAboutUs === HOW_DID_HEAR_ABOUT_US.OTHER ? (
              <div className="sm:col-span-2">
                <label
                  htmlFor="signup-how-other"
                  className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Tell us more
                </label>
                <input
                  id="signup-how-other"
                  type="text"
                  autoComplete="off"
                  value={signupDetails.howDidHearAboutUsOther ?? ``}
                  onChange={(event) => updateSignup({ howDidHearAboutUsOther: event.target.value })}
                  className={`${SIGNUP_INPUT_CLASS} ${
                    fieldErrors.howDidHearAboutUsOther ? `border-red-500 ring-2 ring-red-500/20` : ``
                  }`}
                  placeholder="Where did you hear about Remoola?"
                />
                {fieldErrors.howDidHearAboutUsOther ? (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.howDidHearAboutUsOther}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <p className="font-semibold text-slate-900 dark:text-white">What happens next</p>
            <p className="mt-2 leading-6">
              The remaining steps adapt to your selected path: personal contractor, contractor entity, or business.
            </p>
          </div>

          {googleSignupStartUrl && !isGoogleSignup ? (
            <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4 dark:border-primary-900/50 dark:bg-primary-950/30">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Prefer Google sign-up?</p>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Continue with Google and keep the same selected account type and contractor kind.
              </p>
              <button
                type="button"
                onClick={async () => {
                  await fetch(`/api/consumer/auth/clear-cookies`, { method: `POST`, credentials: `include` });
                  window.location.href = googleSignupStartUrl;
                }}
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-xs ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-900 dark:text-white dark:ring-slate-700 dark:hover:bg-slate-800"
              >
                <GoogleIcon size={18} />
                Continue with Google
              </button>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            <p className="font-semibold text-slate-900 dark:text-white">Need a different account path?</p>
            <p className="mt-2 leading-6">
              You can go back at any point before submit to change account type or contractor structure.
            </p>
            <div className="mt-4">
              <Link
                href="/signup/start"
                prefetch={false}
                className="text-sm font-semibold text-primary-600 dark:text-primary-400"
              >
                Back to account selection
              </Link>
            </div>
          </div>
        </div>
      </div>

      <PrevNextButtons onNext={handleNext} hideLoginLink />
    </div>
  );
}
