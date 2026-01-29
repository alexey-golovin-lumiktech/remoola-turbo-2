'use client';

import { useState } from 'react';

import { SelectWithClear } from '@remoola/ui/SelectWithClear';

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

const {
  errorTextClass,
  formInputFullWidth,
  formInputError,
  signupStepCard,
  signupStepGrid,
  signupStepGroup,
  signupStepLabel,
  signupStepTitle,
} = styles;

const joinClasses = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(` `);

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
        <div className={signupStepGroup}>
          <label className={signupStepLabel}>First name</label>
          <input
            type="text"
            value={personal.firstName}
            onChange={(e) => {
              updatePersonal({ firstName: e.target.value });
              clearError(`firstName`);
            }}
            className={joinClasses(formInputFullWidth, fieldErrors.firstName && formInputError)}
          />
          {fieldErrors.firstName && <p className={errorTextClass}>{fieldErrors.firstName}</p>}
        </div>
        <div className={signupStepGroup}>
          <label className={signupStepLabel}>Last name</label>
          <input
            type="text"
            value={personal.lastName}
            onChange={(e) => {
              updatePersonal({ lastName: e.target.value });
              clearError(`lastName`);
            }}
            className={joinClasses(formInputFullWidth, fieldErrors.lastName && formInputError)}
          />
          {fieldErrors.lastName && <p className={errorTextClass}>{fieldErrors.lastName}</p>}
        </div>
      </div>

      <div className={signupStepGroup}>
        <label className={signupStepLabel}>Citizen of</label>
        <input
          type="text"
          value={personal.citizenOf}
          onChange={(e) => {
            updatePersonal({ citizenOf: e.target.value });
            clearError(`citizenOf`);
          }}
          className={joinClasses(formInputFullWidth, fieldErrors.citizenOf && formInputError)}
        />
        {fieldErrors.citizenOf && <p className={errorTextClass}>{fieldErrors.citizenOf}</p>}
      </div>

      <div className={signupStepGroup}>
        <label className={signupStepLabel}>Country of tax residence</label>
        <input
          type="text"
          value={personal.countryOfTaxResidence}
          onChange={(e) => {
            updatePersonal({ countryOfTaxResidence: e.target.value });
            clearError(`countryOfTaxResidence`);
          }}
          className={joinClasses(formInputFullWidth, fieldErrors.countryOfTaxResidence && formInputError)}
        />
        {fieldErrors.countryOfTaxResidence && <p className={errorTextClass}>{fieldErrors.countryOfTaxResidence}</p>}
      </div>

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

      <div className={signupStepGroup}>
        <label className={signupStepLabel}>Tax ID</label>
        <input
          type="text"
          value={personal.taxId}
          onChange={(e) => updatePersonal({ taxId: e.target.value })}
          className={formInputFullWidth}
        />
      </div>

      <div className={signupStepGroup}>
        <label className={signupStepLabel}>Date of birth</label>
        <input
          type="date"
          value={personal.dateOfBirth}
          onChange={(e) => {
            updatePersonal({ dateOfBirth: e.target.value });
            clearError(`dateOfBirth`);
          }}
          className={joinClasses(formInputFullWidth, fieldErrors.dateOfBirth && formInputError)}
        />
        {fieldErrors.dateOfBirth && <p className={errorTextClass}>{fieldErrors.dateOfBirth}</p>}
      </div>

      <div className={signupStepGroup}>
        <label className={signupStepLabel}>Passport/ID number</label>
        <input
          type="text"
          value={personal.passportOrIdNumber}
          onChange={(e) => updatePersonal({ passportOrIdNumber: e.target.value })}
          className={formInputFullWidth}
        />
      </div>

      <div className={signupStepGroup}>
        <label className={signupStepLabel}>Phone number</label>
        <input
          type="tel"
          value={personal.phoneNumber}
          onChange={(e) => {
            updatePersonal({ phoneNumber: e.target.value });
            clearError(`phoneNumber`);
          }}
          className={joinClasses(formInputFullWidth, fieldErrors.phoneNumber && formInputError)}
        />
        {fieldErrors.phoneNumber && <p className={errorTextClass}>{fieldErrors.phoneNumber}</p>}
      </div>

      <PrevNextButtons handleClick={() => handleSubmit()} />
    </div>
  );
}
