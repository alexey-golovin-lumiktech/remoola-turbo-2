'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { FormInput, FormSelect, GoogleIcon } from '../../../../../components/ui';
import styles from '../../../../../components/ui/classNames.module.css';
import { PasswordInput } from '../../../../../components/ui/PasswordInput';
import {
  STEP_NAME,
  type IHowDidHearAboutUs,
  HOW_DID_HEAR_ABOUT_US,
  HOW_DID_HEAR_ABOUT_US_LABEL,
  ACCOUNT_TYPE,
  CONTRACTOR_KIND,
} from '../../../../../types';
import { useSignupForm, useSignupSteps } from '../../hooks';
import { generatePassword } from '../../utils';
import { createSignupDetailsSchema, getFieldErrors } from '../../validation';
import { PrevNextButtons } from '../PrevNextButtons';

const {
  errorTextClass,
  flexRowGap3,
  formInputError,
  formInputFullWidth,
  inlineFlexItemsCenterGap2,
  loginButton,
  mt4,
  signupGenerateButton,
  signupPasswordInput,
  signupPasswordRow,
  signupStepCard,
  signupStepGroup,
  signupStepGroupLg,
  signupStepLabelInline,
  signupStepSubtitle,
  signupStepTitleLg,
  textCenter,
  textMutedGray,
} = styles;

const joinClasses = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(` `);

const pillToggleBase: Record<`md` | `lg`, string> = {
  md: styles.pillToggleBaseMd!,
  lg: styles.pillToggleBaseLg!,
};

const pillToggleActive = styles.pillToggleActive;
const pillToggleInactiveMd = styles.pillToggleInactiveMd;
const pillToggleInactiveLg = styles.pillToggleInactiveLg;

const getToggleButtonClasses = (isActive: boolean, variant: `md` | `lg` = `md`) => {
  const base = pillToggleBase[variant];
  const state = isActive ? pillToggleActive : variant === `lg` ? pillToggleInactiveLg : pillToggleInactiveMd;
  return joinClasses(base, state);
};

export function SignupDetailsStep() {
  const params = useSearchParams();
  const { signupDetails: signup, updateSignup, googleSignupToken } = useSignupForm();
  const googleTokenFromUrl = params.get(`googleSignupToken`);
  const isSigningUpViaGoogle = Boolean(googleSignupToken) || Boolean(googleTokenFromUrl);
  const googleSignupStartUrl = useMemo(() => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!apiBaseUrl || apiBaseUrl.length === 0) return null;
    const url = new URL(`${apiBaseUrl}/consumer/auth/google/start`);
    url.searchParams.set(`next`, `/signup`);
    if (signup.accountType) url.searchParams.set(`accountType`, signup.accountType);
    if (signup.accountType === `CONTRACTOR` && signup.contractorKind) {
      url.searchParams.set(`contractorKind`, signup.contractorKind);
    }
    return url.toString();
  }, [signup.accountType, signup.contractorKind]);
  const { markSubmitted, goNext } = useSignupSteps();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const emailLocked = isSigningUpViaGoogle;

  const clearError = (field: string) => {
    if (!fieldErrors[field]) return;
    setFieldErrors((prev) => {
      const { [field]: _ignored, ...rest } = prev; /* eslint-disable-line */
      return rest;
    });
  };

  const handleSubmit = () => {
    const schema = createSignupDetailsSchema(isSigningUpViaGoogle);
    const result = schema.safeParse(signup);
    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      return;
    }

    setFieldErrors({});
    markSubmitted(STEP_NAME.SIGNUP_DETAILS);
    goNext();
  };

  return (
    <div className={signupStepCard}>
      <h1 className={signupStepTitleLg}>Create your account</h1>
      <p className={signupStepSubtitle}>Start by entering your basic account details.</p>

      <div className={signupStepGroupLg}>
        <FormInput
          label="Email"
          type="email"
          value={signup.email}
          onChange={(value) => updateSignup({ email: value })}
          error={fieldErrors.email}
          onErrorClear={() => clearError(`email`)}
          disabled={emailLocked}
          placeholder="you@example.com"
          required
        />
      </div>

      {!emailLocked && (
        <>
          <div className={signupStepGroupLg}>
            <label className={signupStepLabelInline}>Password</label>

            <div className={signupPasswordRow}>
              <div className={signupPasswordInput}>
                <PasswordInput
                  value={signup.password}
                  onChange={(value) => {
                    updateSignup({ password: value });
                    clearError(`password`);
                  }}
                  placeholder="Enter password"
                  inputClassName={joinClasses(formInputFullWidth, fieldErrors.password && formInputError)}
                />
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const generated = generatePassword(12);
                  updateSignup({ password: generated, confirmPassword: generated });
                  clearError(`password`);
                  clearError(`confirmPassword`);
                }}
                className={signupGenerateButton}
              >
                Generate
              </button>
            </div>
            {fieldErrors.password && <p className={errorTextClass}>{fieldErrors.password}</p>}
          </div>

          <div className={signupStepGroupLg}>
            <label className={signupStepLabelInline}>Confirm password</label>
            <PasswordInput
              value={signup.confirmPassword}
              onChange={(value) => {
                updateSignup({ confirmPassword: value });
                clearError(`confirmPassword`);
              }}
              placeholder="Confirm password"
              inputClassName={joinClasses(formInputFullWidth, fieldErrors.confirmPassword && formInputError)}
            />
            {fieldErrors.confirmPassword && <p className={errorTextClass}>{fieldErrors.confirmPassword}</p>}
          </div>
        </>
      )}

      <FormSelect
        label="How Did You Hear About Us?"
        value={signup.howDidHearAboutUs ?? ``}
        onChange={(value) => {
          const howDidHearAboutUs = value ? (value as IHowDidHearAboutUs) : null;
          const howDidHearAboutUsOther =
            howDidHearAboutUs !== HOW_DID_HEAR_ABOUT_US.OTHER ? null : signup.howDidHearAboutUsOther;
          updateSignup({ howDidHearAboutUs, howDidHearAboutUsOther });
        }}
        options={[
          {
            value: HOW_DID_HEAR_ABOUT_US.EMPLOYER_COMPANY,
            label: HOW_DID_HEAR_ABOUT_US_LABEL[HOW_DID_HEAR_ABOUT_US.EMPLOYER_COMPANY],
          },
          {
            value: HOW_DID_HEAR_ABOUT_US.EMPLOYEE_CONTRACTOR,
            label: HOW_DID_HEAR_ABOUT_US_LABEL[HOW_DID_HEAR_ABOUT_US.EMPLOYEE_CONTRACTOR],
          },
          {
            value: HOW_DID_HEAR_ABOUT_US.REFERRED_RECOMMENDED,
            label: HOW_DID_HEAR_ABOUT_US_LABEL[HOW_DID_HEAR_ABOUT_US.REFERRED_RECOMMENDED],
          },
          {
            value: HOW_DID_HEAR_ABOUT_US.EMAIL_INVITE,
            label: HOW_DID_HEAR_ABOUT_US_LABEL[HOW_DID_HEAR_ABOUT_US.EMAIL_INVITE],
          },
          { value: HOW_DID_HEAR_ABOUT_US.GOOGLE, label: HOW_DID_HEAR_ABOUT_US_LABEL[HOW_DID_HEAR_ABOUT_US.GOOGLE] },
          { value: HOW_DID_HEAR_ABOUT_US.FACEBOOK, label: HOW_DID_HEAR_ABOUT_US_LABEL[HOW_DID_HEAR_ABOUT_US.FACEBOOK] },
          { value: HOW_DID_HEAR_ABOUT_US.TWITTER, label: HOW_DID_HEAR_ABOUT_US_LABEL[HOW_DID_HEAR_ABOUT_US.TWITTER] },
          {
            value: HOW_DID_HEAR_ABOUT_US.LINKED_IN,
            label: HOW_DID_HEAR_ABOUT_US_LABEL[HOW_DID_HEAR_ABOUT_US.LINKED_IN],
          },
          { value: HOW_DID_HEAR_ABOUT_US.OTHER, label: HOW_DID_HEAR_ABOUT_US_LABEL[HOW_DID_HEAR_ABOUT_US.OTHER] },
        ]}
        placeholder="Select or search..."
        isClearable
      />
      {signup.howDidHearAboutUs === HOW_DID_HEAR_ABOUT_US.OTHER && (
        <FormInput
          label="How did you hear about us? (other)"
          value={signup.howDidHearAboutUsOther ?? ``}
          onChange={(howDidHearAboutUsOther) => updateSignup({ howDidHearAboutUsOther })}
        />
      )}

      <div className={signupStepGroup}>
        <label className={signupStepLabelInline}>Account type</label>

        <div className={flexRowGap3}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              updateSignup({
                accountType: ACCOUNT_TYPE.BUSINESS,
                contractorKind: null, // must reset to null if switching from contractor
              });
              clearError(`accountType`);
              clearError(`contractorKind`);
            }}
            className={getToggleButtonClasses(signup.accountType === ACCOUNT_TYPE.BUSINESS)}
          >
            Business
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              updateSignup({
                accountType: ACCOUNT_TYPE.CONTRACTOR,
                contractorKind: signup.contractorKind ?? CONTRACTOR_KIND.INDIVIDUAL,
              });
              clearError(`accountType`);
              clearError(`contractorKind`);
            }}
            className={getToggleButtonClasses(signup.accountType === ACCOUNT_TYPE.CONTRACTOR)}
          >
            Contractor
          </button>
        </div>
        {(fieldErrors.accountType ||
          (fieldErrors.contractorKind && signup.accountType !== ACCOUNT_TYPE.CONTRACTOR)) && (
          <p className={errorTextClass}>{fieldErrors.accountType ?? fieldErrors.contractorKind}</p>
        )}
      </div>

      {/* Contractor kind (ONLY if contractor) */}
      {signup.accountType === ACCOUNT_TYPE.CONTRACTOR && (
        <div className={signupStepGroup}>
          <label className={signupStepLabelInline}>Contractor kind</label>

          <div className={flexRowGap3}>
            <button
              type="button"
              onClick={(e) => (
                e.preventDefault(),
                e.stopPropagation(),
                updateSignup({ contractorKind: CONTRACTOR_KIND.INDIVIDUAL }),
                clearError(`contractorKind`)
              )}
              className={getToggleButtonClasses(signup.contractorKind === CONTRACTOR_KIND.INDIVIDUAL)}
            >
              Individual
            </button>

            <button
              type="button"
              onClick={(e) => (
                e.preventDefault(),
                e.stopPropagation(),
                updateSignup({ contractorKind: CONTRACTOR_KIND.ENTITY }),
                clearError(`contractorKind`)
              )}
              className={getToggleButtonClasses(signup.contractorKind === CONTRACTOR_KIND.ENTITY)}
            >
              Entity
            </button>
          </div>
          {fieldErrors.contractorKind && <p className={errorTextClass}>{fieldErrors.contractorKind}</p>}
        </div>
      )}

      <PrevNextButtons nextLabel="Continue" handleClick={() => handleSubmit()} />

      {googleSignupStartUrl && !emailLocked && (
        <>
          <p className={joinClasses(textCenter, textMutedGray, mt4)}>or</p>
          <button
            type="button"
            className={loginButton}
            onClick={async () => {
              await fetch(`/api/consumer/auth/clear-cookies`, { method: `POST`, credentials: `include` });
              window.location.href = googleSignupStartUrl;
            }}
          >
            <span className={inlineFlexItemsCenterGap2}>
              <GoogleIcon size={20} />
              Sign up with Google
            </span>
          </button>
        </>
      )}
    </div>
  );
}
