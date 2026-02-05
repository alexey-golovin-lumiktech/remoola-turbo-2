'use client';

import { useState } from 'react';

import { FormInput } from '../../../../../components/ui';
import styles from '../../../../../components/ui/classNames.module.css';
import { STEP_NAME } from '../../../../../types';
import { useSignupForm, useSignupSteps, useSignupSubmit } from '../../hooks';
import { addressDetailsSchema, getFieldErrors } from '../../validation';
import { PrevNextButtons } from '../PrevNextButtons';

const { errorTextClass, signupStepCard, signupStepTitle } = styles;

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

      <FormInput
        label="Postal code"
        value={addressDetails.postalCode || ``}
        onChange={(value) => updateAddress({ postalCode: value })}
        error={fieldErrors.postalCode}
        onErrorClear={() => clearError(`postalCode`)}
      />

      <FormInput
        label="Country"
        value={addressDetails.country || ``}
        onChange={(value) => updateAddress({ country: value })}
        error={fieldErrors.country}
        onErrorClear={() => clearError(`country`)}
      />

      <FormInput
        label="State / Region"
        value={addressDetails.state || ``}
        onChange={(value) => updateAddress({ state: value })}
      />

      <FormInput
        label="City"
        value={addressDetails.city || ``}
        onChange={(value) => updateAddress({ city: value })}
        error={fieldErrors.city}
        onErrorClear={() => clearError(`city`)}
      />

      <FormInput
        label="Street"
        value={addressDetails.street || ``}
        onChange={(value) => updateAddress({ street: value })}
        error={fieldErrors.street}
        onErrorClear={() => clearError(`street`)}
      />

      {error && <p className={errorTextClass}>{error}</p>}

      <PrevNextButtons nextLabel={loading ? `Submitting...` : prevNextButtonsText} handleClick={() => handleSubmit()} />
    </div>
  );
}
