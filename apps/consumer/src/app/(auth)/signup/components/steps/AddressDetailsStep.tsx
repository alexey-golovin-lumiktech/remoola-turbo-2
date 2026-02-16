'use client';

import { useEffect, useState } from 'react';

import { CountrySelect, FormInput } from '../../../../../components/ui';
import styles from '../../../../../components/ui/classNames.module.css';
import { STEP_NAME } from '../../../../../types';
import { useSignupForm, useSignupSteps, useSignupSubmit } from '../../hooks';
import { parseAddressFromString } from '../../utils/parseAddressFromString';
import { addressDetailsSchema, getFieldErrors } from '../../validation';
import { PrevNextButtons } from '../PrevNextButtons';

const { errorTextClass, signupStepCard, signupStepTitle } = styles;

export function AddressDetailsStep() {
  const { isContractorIndividual, isBusiness, isContractorEntity, addressDetails, personalDetails, updateAddress } =
    useSignupForm();
  const { markSubmitted, goNext } = useSignupSteps();
  const { submit, loading, error } = useSignupSubmit();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isEntity = isBusiness || isContractorEntity;

  // Prefill / normalize address details from Legal address (Personal step) for Business / Contractor Entity
  useEffect(() => {
    if (!isEntity || !addressDetails.street?.trim()) return;

    const parsed = parseAddressFromString(addressDetails.street);
    const updates: Partial<typeof addressDetails> = {};
    const needsPrefill =
      !addressDetails.postalCode?.trim() &&
      !addressDetails.country?.trim() &&
      !addressDetails.state?.trim() &&
      !addressDetails.city?.trim();

    // Always normalize street when it's a full address (parsed street differs from input)
    if (parsed.street && parsed.street !== addressDetails.street) {
      updates.street = parsed.street;
    }
    if (needsPrefill) {
      if (parsed.postalCode) updates.postalCode = parsed.postalCode;
      if (parsed.country) updates.country = parsed.country;
      if (parsed.state) updates.state = parsed.state;
      if (parsed.city) updates.city = parsed.city;
    }
    if (Object.keys(updates).length > 0) {
      updateAddress(updates);
    } else if (needsPrefill && personalDetails.countryOfTaxResidence?.trim()) {
      updateAddress({ country: personalDetails.countryOfTaxResidence });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps omitted to avoid loop on update
  }, [isEntity, addressDetails.street]);

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
    return goNext();
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

      <CountrySelect
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
        error={fieldErrors.state}
        onErrorClear={() => clearError(`state`)}
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
