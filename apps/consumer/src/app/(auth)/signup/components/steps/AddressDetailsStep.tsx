'use client';

import { useCallback, useEffect, useState } from 'react';

import { AddressDetailsFields, type AddressDetailsValues } from '../../../../../components/address-details';
import styles from '../../../../../components/ui/classNames.module.css';
import { STEP_NAME } from '../../../../../types';
import { useSignupForm, useSignupSteps, useSignupSubmit } from '../../hooks';
import { parseAddressFromString } from '../../utils/parseAddressFromString';
import { addressDetailsSchema, getFieldErrors } from '../../validation';
import { PrevNextButtons } from '../PrevNextButtons';

const { signupStepCard, signupStepTitle } = styles;

export function AddressDetailsStep() {
  const { isContractorIndividual, isBusiness, isContractorEntity, addressDetails, personalDetails, updateAddress } =
    useSignupForm();
  const { markSubmitted, goNext } = useSignupSteps();
  const { submit, loading } = useSignupSubmit();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isEntity = isBusiness || isContractorEntity;

  // Prefill / normalize address details from Legal address (Personal step) for Business / Contractor Entity
  useEffect(() => {
    if (!isEntity || !addressDetails.street?.trim()) return;

    const parsed = parseAddressFromString(addressDetails.street, {
      countryHint: personalDetails.countryOfTaxResidence,
    });
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
  }, [isEntity, addressDetails.street, personalDetails.countryOfTaxResidence]);

  const clearError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const { [field]: _ignored, ...rest } = prev; /* eslint-disable-line */
      return rest;
    });
  }, []);

  const validateOnBlur = () => {
    const result = addressDetailsSchema.safeParse(addressDetails);
    if (result.success) setFieldErrors({});
    else setFieldErrors(getFieldErrors(result.error));
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

  const handleAddressChange = useCallback(
    (field: keyof AddressDetailsValues, value: string) => {
      updateAddress({ [field]: value });
      clearError(field);
    },
    [updateAddress, clearError],
  );

  const values = {
    postalCode: addressDetails.postalCode ?? ``,
    country: addressDetails.country ?? ``,
    state: addressDetails.state ?? ``,
    city: addressDetails.city ?? ``,
    street: addressDetails.street ?? ``,
  };

  return (
    <div className={signupStepCard}>
      <h1 className={signupStepTitle}>Address details</h1>

      <AddressDetailsFields
        values={values}
        onChange={handleAddressChange}
        errors={fieldErrors}
        onErrorClear={clearError}
        onBlur={validateOnBlur}
      />

      <PrevNextButtons nextLabel={loading ? `Submitting...` : prevNextButtonsText} handleClick={() => handleSubmit()} />
    </div>
  );
}
