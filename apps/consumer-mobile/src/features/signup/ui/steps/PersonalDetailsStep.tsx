'use client';

import { useCallback, useState } from 'react';

import { useSignupForm } from '../../SignupFormContext';
import { useSignupSteps } from '../../SignupStepsContext';
import { STEP_NAME } from '../../stepNames';
import { entityDetailsSchema, getFieldErrors, personalDetailsSchema } from '../../validation';
import { SIGNUP_INPUT_CLASS } from '../inputClass';
import { PrevNextButtons } from '../PrevNextButtons';

export function PersonalDetailsStep() {
  const {
    isBusiness,
    isContractorEntity,
    personalDetails,
    organizationDetails,
    addressDetails,
    updatePersonal,
    updateOrganization,
    updateAddress,
  } = useSignupForm();
  const { markSubmitted, goNext } = useSignupSteps();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isEntity = isBusiness || isContractorEntity;

  const clearError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const rest = { ...prev };
      delete rest[field];
      return rest;
    });
  }, []);

  const handleNext = useCallback(() => {
    if (isEntity) {
      const data = {
        companyName: organizationDetails.name,
        countryOfTaxResidence: personalDetails.countryOfTaxResidence,
        taxId: personalDetails.taxId,
        phoneNumber: personalDetails.phoneNumber,
        legalAddress: addressDetails.street,
      };
      const result = entityDetailsSchema.safeParse(data);
      if (!result.success) {
        setFieldErrors(getFieldErrors(result.error));
        return;
      }
    } else {
      const result = personalDetailsSchema.safeParse(personalDetails);
      if (!result.success) {
        setFieldErrors(getFieldErrors(result.error));
        return;
      }
    }
    setFieldErrors({});
    markSubmitted(STEP_NAME.PERSONAL_DETAILS);
    goNext();
  }, [isEntity, organizationDetails.name, personalDetails, addressDetails.street, markSubmitted, goNext]);

  const labelClass = `mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300`;
  const errorClass = `mt-1 text-sm text-red-600`;

  if (isEntity) {
    return (
      <div
        className={`
        rounded-xl
        border
        border-neutral-200
        bg-white
        shadow-xs
        dark:border-neutral-700
        dark:bg-neutral-900
      `}
      >
        <div className={`p-4 sm:p-6`}>
          <h1
            className={`
            mb-4
            text-lg
            font-semibold
            text-neutral-900
            dark:text-white
          `}
          >
            Entity details
          </h1>
          <div className={`space-y-3`}>
            <div>
              <label htmlFor="pe-company" className={labelClass}>
                Company name
              </label>
              <input
                id="pe-company"
                type="text"
                autoComplete="organization"
                placeholder="Your company name"
                value={organizationDetails.name}
                onChange={(e) => updateOrganization({ name: e.target.value })}
                className={SIGNUP_INPUT_CLASS}
                onFocus={() => clearError(`companyName`)}
                aria-invalid={!!fieldErrors.companyName || undefined}
                aria-describedby={fieldErrors.companyName ? `pe-company-err` : undefined}
              />
              {fieldErrors.companyName && (
                <p id="pe-company-err" className={errorClass} role="alert">
                  {fieldErrors.companyName}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="pe-tax-residence" className={labelClass}>
                Country of tax residence
              </label>
              <input
                id="pe-tax-residence"
                type="text"
                autoComplete="country-name"
                placeholder="e.g. United States"
                value={personalDetails.countryOfTaxResidence}
                onChange={(e) => updatePersonal({ countryOfTaxResidence: e.target.value })}
                className={SIGNUP_INPUT_CLASS}
                onFocus={() => clearError(`countryOfTaxResidence`)}
                aria-invalid={!!fieldErrors.countryOfTaxResidence || undefined}
                aria-describedby={fieldErrors.countryOfTaxResidence ? `pe-tax-residence-err` : undefined}
              />
              {fieldErrors.countryOfTaxResidence && (
                <p id="pe-tax-residence-err" className={errorClass} role="alert">
                  {fieldErrors.countryOfTaxResidence}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="pe-taxid" className={labelClass}>
                Tax ID
              </label>
              <input
                id="pe-taxid"
                type="text"
                autoComplete="off"
                placeholder="00-0000000"
                value={personalDetails.taxId}
                onChange={(e) => updatePersonal({ taxId: e.target.value })}
                className={SIGNUP_INPUT_CLASS}
                onFocus={() => clearError(`taxId`)}
                aria-invalid={!!fieldErrors.taxId || undefined}
                aria-describedby={fieldErrors.taxId ? `pe-taxid-err` : undefined}
              />
              {fieldErrors.taxId && (
                <p id="pe-taxid-err" className={errorClass} role="alert">
                  {fieldErrors.taxId}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="pe-phone" className={labelClass}>
                Phone number
              </label>
              <input
                id="pe-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+1 (555) 000-0000"
                value={personalDetails.phoneNumber}
                onChange={(e) => updatePersonal({ phoneNumber: e.target.value })}
                className={SIGNUP_INPUT_CLASS}
                onFocus={() => clearError(`phoneNumber`)}
                aria-invalid={!!fieldErrors.phoneNumber || undefined}
                aria-describedby={fieldErrors.phoneNumber ? `pe-phone-err` : undefined}
              />
              {fieldErrors.phoneNumber && (
                <p id="pe-phone-err" className={errorClass} role="alert">
                  {fieldErrors.phoneNumber}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="pe-legal-address" className={labelClass}>
                Legal address
              </label>
              <input
                id="pe-legal-address"
                type="text"
                autoComplete="street-address"
                placeholder="123 Main St, Suite 100"
                value={addressDetails.street}
                onChange={(e) => updateAddress({ street: e.target.value })}
                className={SIGNUP_INPUT_CLASS}
                onFocus={() => clearError(`legalAddress`)}
                aria-invalid={!!fieldErrors.legalAddress || undefined}
                aria-describedby={fieldErrors.legalAddress ? `pe-legal-address-err` : undefined}
              />
              {fieldErrors.legalAddress && (
                <p id="pe-legal-address-err" className={errorClass} role="alert">
                  {fieldErrors.legalAddress}
                </p>
              )}
            </div>
          </div>
        </div>
        <PrevNextButtons onNext={handleNext} />
      </div>
    );
  }

  return (
    <div
      className={`
      rounded-xl
      border
      border-neutral-200
      bg-white
      shadow-xs
      dark:border-neutral-700
      dark:bg-neutral-900
    `}
    >
      <div className={`p-4 sm:p-6`}>
        <h1
          className={`
          mb-4
          text-lg
          font-semibold
          text-neutral-900
          dark:text-white
        `}
        >
          Personal details
        </h1>
        <div className={`space-y-3`}>
          {(
            [
              { key: `firstName` as const, label: `First name`, type: `text` as const, autoComplete: `given-name` },
              { key: `lastName` as const, label: `Last name`, type: `text` as const, autoComplete: `family-name` },
              { key: `citizenOf` as const, label: `Citizenship`, type: `text` as const, autoComplete: `country-name` },
              {
                key: `countryOfTaxResidence` as const,
                label: `Country of tax residence`,
                type: `text` as const,
                autoComplete: `country-name`,
              },
              { key: `legalStatus` as const, label: `Legal status`, type: `text` as const, autoComplete: `off` },
              { key: `taxId` as const, label: `Tax ID`, type: `text` as const, autoComplete: `off` },
              { key: `dateOfBirth` as const, label: `Date of birth`, type: `date` as const, autoComplete: `bday` },
              {
                key: `passportOrIdNumber` as const,
                label: `Passport / ID number`,
                type: `text` as const,
                autoComplete: `off`,
              },
              { key: `phoneNumber` as const, label: `Phone number`, type: `tel` as const, autoComplete: `tel` },
            ] as const
          ).map(({ key, label, type, autoComplete }) => {
            const errId = `pi-${key}-err`;
            const hasError = !!fieldErrors[key];
            return (
              <div key={key}>
                <label htmlFor={`pi-${key}`} className={labelClass}>
                  {label}
                </label>
                <input
                  id={`pi-${key}`}
                  type={type}
                  inputMode={type === `tel` ? `tel` : undefined}
                  autoComplete={autoComplete}
                  value={personalDetails[key] ?? ``}
                  onChange={(e) => updatePersonal({ [key]: e.target.value })}
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
      <PrevNextButtons onNext={handleNext} />
    </div>
  );
}
