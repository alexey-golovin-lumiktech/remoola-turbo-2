'use client';

import Link from 'next/link';
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
import styles from './SignupDetailsStep.module.css';

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

const STRENGTH_STYLE_KEYS: Record<StrengthKey, `strengthWeak` | `strengthFair` | `strengthGood` | `strengthStrong`> = {
  weak: `strengthWeak`,
  fair: `strengthFair`,
  good: `strengthGood`,
  strong: `strengthStrong`,
};

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
    <div className={styles.root} data-testid="consumer-signup-details-page">
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.content}>
            <h1 className={styles.title}>Signup details</h1>
            {!isGoogleSignup ? (
              <>
                <div className={styles.field}>
                  <label htmlFor="sd-email" className={styles.label}>
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
                    className={`${SIGNUP_INPUT_CLASS} ${fieldErrors.email ? styles.inputError : ``}`}
                    aria-invalid={!!fieldErrors.email || undefined}
                    aria-describedby={fieldErrors.email ? `sd-email-err` : undefined}
                  />
                  {fieldErrors.email ? (
                    <p id="sd-email-err" className={styles.errorText} role="alert">
                      <ExclamationCircleIcon className={styles.errorIcon} />
                      {fieldErrors.email}
                    </p>
                  ) : null}
                </div>
                <div className={styles.field}>
                  <label htmlFor="sd-password" className={styles.label}>
                    Password
                  </label>
                  <PasswordInput
                    id="sd-password"
                    name="sd-password"
                    value={signupDetails.password}
                    onChange={handlePasswordChange}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, password: true }));
                      const error = validateField(`password`, signupDetails.password);
                      setFieldErrors((prev) => ({ ...prev, password: error ?? `` }));
                    }}
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    toggleAriaLabel="Toggle password visibility"
                    inputClassName={`${SIGNUP_INPUT_CLASS} ${fieldErrors.password ? styles.inputError : ``}`}
                  />
                  {signupDetails.password ? (
                    <div className={styles.strengthWrap}>
                      <div className={styles.passwordStrengthRow}>
                        <span className={styles.passwordStrengthLabel}>Password strength:</span>
                        <span className={styles[STRENGTH_STYLE_KEYS[passwordStrength.strengthKey]]}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className={styles.barRow}>
                        {[...Array(5)].map((_, i) => {
                          const filled = i < passwordStrength.score;
                          const barClass = filled
                            ? passwordStrength.score <= 1
                              ? styles.barWeak
                              : passwordStrength.score <= 3
                                ? styles.barFair
                                : styles.barGood
                            : styles.barEmpty;
                          return <div key={i} className={`${styles.barSegment} ${barClass}`} />;
                        })}
                      </div>
                    </div>
                  ) : null}
                  {fieldErrors.password ? (
                    <p id="sd-password-err" className={styles.errorText} role="alert">
                      <ExclamationCircleIcon className={styles.errorIcon} />
                      {fieldErrors.password}
                    </p>
                  ) : null}
                  <p className={styles.hint}>At least 8 characters with mixed case, numbers & symbols</p>
                </div>
                <div className={styles.field}>
                  <label htmlFor="sd-confirm" className={styles.label}>
                    Confirm password
                  </label>
                  <PasswordInput
                    id="sd-confirm"
                    name="sd-confirm"
                    value={signupDetails.confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, confirmPassword: true }));
                      const error = validateField(`confirmPassword`, signupDetails.confirmPassword);
                      setFieldErrors((prev) => ({ ...prev, confirmPassword: error ?? `` }));
                    }}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    toggleAriaLabel="Toggle confirm password visibility"
                    inputClassName={`${SIGNUP_INPUT_CLASS} ${fieldErrors.confirmPassword ? styles.inputError : ``}`}
                  />
                  {signupDetails.confirmPassword && signupDetails.confirmPassword === signupDetails.password ? (
                    <p className={styles.matchText}>
                      <CheckCircleIcon className={styles.errorIcon} />
                      Passwords match
                    </p>
                  ) : null}
                  {fieldErrors.confirmPassword ? (
                    <p id="sd-confirm-err" className={styles.errorText} role="alert">
                      <ExclamationCircleIcon className={styles.errorIcon} />
                      {fieldErrors.confirmPassword}
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}
            {isGoogleSignup && signupDetails.email ? (
              <div className={styles.googleBanner}>
                <p className={styles.googleBannerText}>
                  <InformationCircleIcon className={styles.googleBannerIcon} />
                  Signing up with {signupDetails.email}
                </p>
              </div>
            ) : null}
            {isGoogleSignup && googleSignupStartUrl ? (
              <p className={styles.googleNote}>Google sign-up started. To use email/password instead, go back.</p>
            ) : null}
            <div className={styles.howField}>
              <label htmlFor="sd-how" className={styles.label}>
                How did you hear about us? <span className={styles.optional}>(Optional)</span>
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
            {signupDetails.howDidHearAboutUs === HOW_DID_HEAR_ABOUT_US.OTHER ? (
              <div className={styles.howField}>
                <label htmlFor="sd-how-other" className={styles.label}>
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
            ) : null}
            <PrevNextButtons onNext={handleNext} hideLoginLink />
            {googleSignupStartUrl && !isGoogleSignup ? (
              <>
                <div className={styles.dividerWrap}>
                  <div className={styles.dividerLine}>
                    <div className={styles.dividerLineInner} />
                  </div>
                  <div className={styles.dividerTextWrap}>
                    <span className={styles.dividerText}>Or continue with</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await fetch(`/api/consumer/auth/clear-cookies`, { method: `POST`, credentials: `include` });
                    window.location.href = googleSignupStartUrl;
                  }}
                  className={styles.googleBtn}
                  data-testid="consumer-mobile-signup-google"
                >
                  <span className={styles.googleBtnInner}>
                    <GoogleIcon size={20} />
                    Continue with Google
                  </span>
                </button>
              </>
            ) : null}
          </div>
        </div>

        <p className={styles.footer}>
          Already have an account?{` `}
          <Link
            href="/login"
            prefetch={false}
            className={styles.signinLink}
            data-testid="consumer-mobile-signup-details-signup-login-link"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
