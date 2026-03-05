'use client';

import { useCallback, useState } from 'react';

import { useSignupForm } from '../../SignupFormContext';
import { useSignupSteps } from '../../SignupStepsContext';
import { STEP_NAME } from '../../stepNames';
import { useSignupSubmit } from '../../useSignupSubmit';
import { addressDetailsSchema, getFieldErrors } from '../../validation';
import { SIGNUP_INPUT_CLASS } from '../inputClass';
import { PrevNextButtons } from '../PrevNextButtons';

export function AddressDetailsStep() {
  const { isContractorIndividual, addressDetails, updateAddress } = useSignupForm();
  const { markSubmitted, goNext } = useSignupSteps();
  const { submit, loading } = useSignupSubmit();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const rest = { ...prev };
      delete rest[field];
      return rest;
    });
  }, []);

  const handleNext = useCallback(() => {
    const result = addressDetailsSchema.safeParse(addressDetails);
    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      return;
    }
    setFieldErrors({});
    markSubmitted(STEP_NAME.ADDRESS_DETAILS);
    if (isContractorIndividual) {
      submit();
      return;
    }
    goNext();
  }, [addressDetails, markSubmitted, isContractorIndividual, submit, goNext]);

  const nextLabel = loading ? `Submitting...` : isContractorIndividual ? `Finish signup` : undefined;

  const labelClass = `mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300`;
  const errorClass = `mt-1 text-sm text-red-600`;

  const fields: {
    key: keyof typeof addressDetails;
    label: string;
    autoComplete: string;
    inputMode?: `text` | `numeric`;
  }[] = [
    { key: `postalCode`, label: `Postal code`, autoComplete: `postal-code`, inputMode: `numeric` },
    { key: `country`, label: `Country`, autoComplete: `country-name` },
    { key: `state`, label: `State / Region`, autoComplete: `address-level1` },
    { key: `city`, label: `City`, autoComplete: `address-level2` },
    { key: `street`, label: `Street`, autoComplete: `street-address` },
  ];

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
      <div className="p-4 sm:p-6">
        <h1 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">Address details</h1>
        <div className="space-y-3">
          {fields.map(({ key, label, autoComplete, inputMode }) => {
            const errId = `ad-${key}-err`;
            const hasError = !!fieldErrors[key];
            return (
              <div key={key}>
                <label htmlFor={`ad-${key}`} className={labelClass}>
                  {label}
                </label>
                <input
                  id={`ad-${key}`}
                  type="text"
                  inputMode={inputMode}
                  autoComplete={autoComplete}
                  value={addressDetails[key] ?? ``}
                  onChange={(e) => updateAddress({ [key]: e.target.value })}
                  className={SIGNUP_INPUT_CLASS}
                  onFocus={() => clearError(key)}
                  aria-invalid={hasError || undefined}
                  aria-describedby={hasError ? errId : undefined}
                />
                {hasError && (
                  <p id={errId} className={errorClass} role="alert">
                    {fieldErrors[key]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <PrevNextButtons onNext={handleNext} nextLabel={nextLabel} />
    </div>
  );
}
