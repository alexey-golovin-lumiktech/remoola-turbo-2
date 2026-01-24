'use client';

import { PasswordInput } from '@remoola/ui/PasswordInput';
import { SelectWithClear } from '@remoola/ui/SelectWithClear';

import styles from '../../../../../components/ui/classNames.module.css';
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
import { PrevNextButtons } from '../PrevNextButtons';

const {
  formInputFullWidth,
  signupGenerateButton,
  signupPasswordInput,
  signupPasswordRow,
  signupStepCard,
  signupStepGroup,
  signupStepGroupLg,
  signupStepLabelInline,
  signupStepSubtitle,
  signupStepTitleLg,
  flexRowGap3,
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
  const { signupDetails: signup, updateSignup } = useSignupForm();
  const { markSubmitted, goNext } = useSignupSteps();

  const handleSubmit = () => {
    markSubmitted(STEP_NAME.SIGNUP_DETAILS);
    goNext();
  };

  return (
    <div className={signupStepCard}>
      <h1 className={signupStepTitleLg}>Create your account</h1>
      <p className={signupStepSubtitle}>Start by entering your basic account details.</p>

      <div className={signupStepGroupLg}>
        <label className={signupStepLabelInline}>Email</label>
        <input
          type="email"
          value={signup.email}
          onChange={(e) => updateSignup({ email: e.target.value })}
          className={formInputFullWidth}
          placeholder="you@example.com"
          required
        />
      </div>

      <div className={signupStepGroupLg}>
        <label className={signupStepLabelInline}>Password</label>

        <div className={signupPasswordRow}>
          <div className={signupPasswordInput}>
            <PasswordInput
              value={signup.password}
              onChange={(value) => updateSignup({ password: value })}
              placeholder="Enter password"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              const generated = generatePassword(12);
              updateSignup({ password: generated, confirmPassword: generated });
            }}
            className={signupGenerateButton}
          >
            Generate
          </button>
        </div>
      </div>

      <div className={signupStepGroupLg}>
        <label className={signupStepLabelInline}>Confirm password</label>
        <PasswordInput
          value={signup.confirmPassword}
          onChange={(value) => updateSignup({ confirmPassword: value })}
          placeholder="Confirm password"
        />
      </div>

      <SelectWithClear<IHowDidHearAboutUs | null>
        label="How Did You Hear About Us?"
        value={signup.howDidHearAboutUs}
        onChange={(howDidHearAboutUs) => {
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
        showNotSelected={false}
        otherValue={signup.howDidHearAboutUsOther}
        onChangeOther={(howDidHearAboutUsOther) => updateSignup({ howDidHearAboutUsOther })}
      />

      <div className={signupStepGroup}>
        <label className={signupStepLabelInline}>Account type</label>

        <div className={flexRowGap3}>
          <button
            type="button"
            onClick={() =>
              updateSignup({
                accountType: ACCOUNT_TYPE.BUSINESS,
                contractorKind: CONTRACTOR_KIND.INDIVIDUAL, // must reset
              })
            }
            className={getToggleButtonClasses(signup.accountType === ACCOUNT_TYPE.BUSINESS)}
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
            className={getToggleButtonClasses(signup.accountType === ACCOUNT_TYPE.CONTRACTOR)}
          >
            Contractor
          </button>
        </div>
      </div>

      {/* Contractor kind (ONLY if contractor) */}
      {signup.accountType === ACCOUNT_TYPE.CONTRACTOR && (
        <div className={signupStepGroup}>
          <label className={signupStepLabelInline}>Contractor kind</label>

          <div className={flexRowGap3}>
            <button
              type="button"
              onClick={() => updateSignup({ contractorKind: CONTRACTOR_KIND.INDIVIDUAL })}
              className={getToggleButtonClasses(signup.contractorKind === CONTRACTOR_KIND.INDIVIDUAL)}
            >
              Individual
            </button>

            <button
              type="button"
              onClick={() => updateSignup({ contractorKind: CONTRACTOR_KIND.ENTITY })}
              className={getToggleButtonClasses(signup.contractorKind === CONTRACTOR_KIND.ENTITY)}
            >
              Entity
            </button>
          </div>
        </div>
      )}

      <PrevNextButtons nextLabel="Continue" onClick={() => handleSubmit()} />
    </div>
  );
}
