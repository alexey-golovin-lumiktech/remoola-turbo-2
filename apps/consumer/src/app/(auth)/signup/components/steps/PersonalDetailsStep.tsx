'use client';

import { useState } from 'react';

import { SelectWithClear } from '@remoola/ui/SelectWithClear';

import { FormInput, DateInput } from '../../../../../components/ui';
import styles from '../../../../../components/ui/classNames.module.css';
import {
  STEP_NAME,
  type ILegalStatusLabel,
  STATUS_LABEL,
  LABEL_STATUS,
  LEGAL_STATUS_LABEL,
} from '../../../../../types';
import { useSignupForm, useSignupSteps } from '../../hooks';
import { getFieldErrors, personalDetailsSchema } from '../../validation';
import { PrevNextButtons } from '../PrevNextButtons';

const { signupStepCard, signupStepGrid, signupStepTitle } = styles;

export function PersonalDetailsStep() {
  const { personalDetails: personal, updatePersonal } = useSignupForm();
  const { markSubmitted, goNext } = useSignupSteps();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) => {
    if (!fieldErrors[field]) return;
    setFieldErrors((prev) => {
      const { [field]: _ignored, ...rest } = prev; /* eslint-disable-line */
      return rest;
    });
  };

  const handleSubmit = () => {
    const result = personalDetailsSchema.safeParse(personal);
    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      return;
    }

    setFieldErrors({});
    markSubmitted(STEP_NAME.PERSONAL_DETAILS);
    goNext();
  };

  return (
    <div className={signupStepCard}>
      <h1 className={signupStepTitle}>Personal details</h1>

      <div className={signupStepGrid}>
        <FormInput
          label="First name"
          value={personal.firstName}
          onChange={(value) => updatePersonal({ firstName: value })}
          error={fieldErrors.firstName}
          onErrorClear={() => clearError(`firstName`)}
        />
        <FormInput
          label="Last name"
          value={personal.lastName}
          onChange={(value) => updatePersonal({ lastName: value })}
          error={fieldErrors.lastName}
          onErrorClear={() => clearError(`lastName`)}
        />
      </div>

      <FormInput
        label="Citizen of"
        value={personal.citizenOf}
        onChange={(value) => updatePersonal({ citizenOf: value })}
        error={fieldErrors.citizenOf}
        onErrorClear={() => clearError(`citizenOf`)}
      />

      <FormInput
        label="Country of tax residence"
        value={personal.countryOfTaxResidence}
        onChange={(value) => updatePersonal({ countryOfTaxResidence: value })}
        error={fieldErrors.countryOfTaxResidence}
        onErrorClear={() => clearError(`countryOfTaxResidence`)}
      />

      <SelectWithClear<ILegalStatusLabel | null>
        label="Legal Status"
        value={STATUS_LABEL[personal.legalStatus!]}
        onChange={(statusLabel) => {
          updatePersonal({ legalStatus: LABEL_STATUS[statusLabel!] });
        }}
        options={[
          { label: LEGAL_STATUS_LABEL.INDIVIDUAL, value: LEGAL_STATUS_LABEL.INDIVIDUAL },
          { label: LEGAL_STATUS_LABEL.INDIVIDUAL_ENTREPRENEUR, value: LEGAL_STATUS_LABEL.INDIVIDUAL_ENTREPRENEUR },
          { label: LEGAL_STATUS_LABEL.SOLE_TRADER, value: LEGAL_STATUS_LABEL.SOLE_TRADER },
        ]}
        showNotSelected={false}
      />

      <FormInput label="Tax ID" value={personal.taxId} onChange={(value) => updatePersonal({ taxId: value })} />

      <DateInput
        label="Date of birth"
        value={personal.dateOfBirth}
        onChange={(value) => updatePersonal({ dateOfBirth: value || `` })}
        error={fieldErrors.dateOfBirth}
        onErrorClear={() => clearError(`dateOfBirth`)}
        placeholder="Select your date of birth"
        required
      />

      <FormInput
        label="Passport/ID number"
        value={personal.passportOrIdNumber}
        onChange={(value) => updatePersonal({ passportOrIdNumber: value })}
      />

      <FormInput
        label="Phone number"
        type="tel"
        value={personal.phoneNumber}
        onChange={(value) => updatePersonal({ phoneNumber: value })}
        error={fieldErrors.phoneNumber}
        onErrorClear={() => clearError(`phoneNumber`)}
      />

      <PrevNextButtons handleClick={() => handleSubmit()} />
    </div>
  );
}
