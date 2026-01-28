'use client';

import { useState } from 'react';

import styles from '../../../../../components/ui/classNames.module.css';
import { STEP_NAME } from '../../../../../types';
import { useSignupForm, useSignupSteps, useSignupSubmit } from '../../hooks';
import { addressDetailsSchema, getFieldErrors } from '../../validation';
import { PrevNextButtons } from '../PrevNextButtons';

const {
  errorTextClass,
  formInputFullWidth,
  formInputError,
  signupStepCard,
  signupStepGroup,
  signupStepLabel,
  signupStepTitle,
} = styles;

const joinClasses = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(` `);

export function AddressDetailsStep() {
  const { isContractorIndividual, addressDetails, updateAddress } = useSignupForm();
  const { markSubmitted, goNext } = useSignupSteps();
  const { submit, loading, error } = useSignupSubmit();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) => {
    if (!fieldErrors[field]) return;
    setFieldErrors((prev) => {
      const { [field]: _ignored, ...rest } = prev; /* eslint-disable-line */
      return rest;
    });
  };

  const handleSubmit = () => {
    const result = addressDetailsSchema.safeParse(addressDetails);
    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      return;
    }

    setFieldErrors({});
    markSubmitted(STEP_NAME.ADDRESS_DETAILS);

    if (isContractorIndividual) return submit();
    else return goNext();
  };

  let prevNextButtonsText = `Next step`;
  if (isContractorIndividual) prevNextButtonsText = `Finish signup`;

  return (
    <div className={signupStepCard}>
      <h1 className={signupStepTitle}>Address details</h1>

      <div className={signupStepGroup}>
        <label className={signupStepLabel}>Postal code</label>
        <input
          type="text"
          value={addressDetails.postalCode || ``}
          onChange={(e) => {
            updateAddress({ postalCode: e.target.value });
            clearError(`postalCode`);
          }}
          className={joinClasses(formInputFullWidth, fieldErrors.postalCode && formInputError)}
        />
        {fieldErrors.postalCode && <p className={errorTextClass}>{fieldErrors.postalCode}</p>}
      </div>

      <div className={signupStepGroup}>
        <label className={signupStepLabel}>Country</label>
        <input
          type="text"
          value={addressDetails.country || ``}
          onChange={(e) => {
            updateAddress({ country: e.target.value });
            clearError(`country`);
          }}
          className={joinClasses(formInputFullWidth, fieldErrors.country && formInputError)}
        />
        {fieldErrors.country && <p className={errorTextClass}>{fieldErrors.country}</p>}
      </div>

      <div className={signupStepGroup}>
        <label className={signupStepLabel}>State / Region</label>
        <input
          type="text"
          value={addressDetails.state || ``}
          onChange={(e) => updateAddress({ state: e.target.value })}
          className={formInputFullWidth}
        />
      </div>

      <div className={signupStepGroup}>
        <label className={signupStepLabel}>City</label>
        <input
          type="text"
          value={addressDetails.city || ``}
          onChange={(e) => {
            updateAddress({ city: e.target.value });
            clearError(`city`);
          }}
          className={joinClasses(formInputFullWidth, fieldErrors.city && formInputError)}
        />
        {fieldErrors.city && <p className={errorTextClass}>{fieldErrors.city}</p>}
      </div>

      <div className={signupStepGroup}>
        <label className={signupStepLabel}>Street</label>
        <input
          type="text"
          value={addressDetails.street || ``}
          onChange={(e) => {
            updateAddress({ street: e.target.value });
            clearError(`street`);
          }}
          className={joinClasses(formInputFullWidth, fieldErrors.street && formInputError)}
        />
        {fieldErrors.street && <p className={errorTextClass}>{fieldErrors.street}</p>}
      </div>

      {error && <p className={errorTextClass}>{error}</p>}

      <PrevNextButtons nextLabel={loading ? `Submitting...` : prevNextButtonsText} handleClick={() => handleSubmit()} />
    </div>
  );
}
