'use client';

import { useCallback, useState } from 'react';

import { toDateOnly } from '../../../../lib/date-utils';
import { CountrySelect } from '../../../../shared/ui/CountrySelect';
import { FORM_ERROR_CLASS, FORM_LABEL_CLASS } from '../../../../shared/ui/form-classes';
import { PhoneInput } from '../../../../shared/ui/PhoneInput';
import { useSignupForm } from '../../SignupFormContext';
import { useSignupSteps } from '../../SignupStepsContext';
import { STEP_NAME } from '../../stepNames';
import { parseAddressFromString } from '../../utils/parseAddressFromString';
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

  const handleLegalAddressChange = useCallback(
    (value: string) => {
      updateAddress({ street: value });
      if (!value.trim()) return;
      const parsed = parseAddressFromString(value);
      const updates: Parameters<typeof updateAddress>[0] = {};
      if (parsed.postalCode) updates.postalCode = parsed.postalCode;
      if (parsed.country) updates.country = parsed.country;
      if (parsed.state) updates.state = parsed.state;
      if (parsed.city) updates.city = parsed.city;
      if (Object.keys(updates).length > 0) {
        updateAddress(updates);
      }
      if (parsed.country) {
        updatePersonal({ countryOfTaxResidence: parsed.country });
      }
    },
    [updateAddress, updatePersonal],
  );

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
              <label htmlFor="pe-company" className={FORM_LABEL_CLASS}>
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
                <p id="pe-company-err" className={FORM_ERROR_CLASS} role="alert">
                  {fieldErrors.companyName}
                </p>
              )}
            </div>
            <CountrySelect
              id="pe-tax-residence"
              label="Country of tax residence"
              value={personalDetails.countryOfTaxResidence}
              onChange={(value) => updatePersonal({ countryOfTaxResidence: value })}
              error={fieldErrors.countryOfTaxResidence}
              onErrorClear={() => clearError(`countryOfTaxResidence`)}
            />
            <div>
              <label htmlFor="pe-taxid" className={FORM_LABEL_CLASS}>
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
                <p id="pe-taxid-err" className={FORM_ERROR_CLASS} role="alert">
                  {fieldErrors.taxId}
                </p>
              )}
            </div>
            <PhoneInput
              id="pe-phone"
              label="Phone number"
              value={personalDetails.phoneNumber}
              onChange={(value) => updatePersonal({ phoneNumber: value ?? `` })}
              error={fieldErrors.phoneNumber}
              onErrorClear={() => clearError(`phoneNumber`)}
              defaultCountryName={personalDetails.countryOfTaxResidence || undefined}
              placeholder="+1 (555) 000-0000"
            />
            <div>
              <label htmlFor="pe-legal-address" className={FORM_LABEL_CLASS}>
                Legal address
              </label>
              <input
                id="pe-legal-address"
                type="text"
                autoComplete="street-address"
                placeholder="123 Main St, Suite 100"
                value={addressDetails.street}
                onChange={(e) => handleLegalAddressChange(e.target.value)}
                className={SIGNUP_INPUT_CLASS}
                onFocus={() => clearError(`legalAddress`)}
                aria-invalid={!!fieldErrors.legalAddress || undefined}
                aria-describedby={fieldErrors.legalAddress ? `pe-legal-address-err` : undefined}
              />
              {fieldErrors.legalAddress && (
                <p id="pe-legal-address-err" className={FORM_ERROR_CLASS} role="alert">
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
            if (key === `citizenOf`) {
              return (
                <CountrySelect
                  key={key}
                  id={`pi-${key}`}
                  label={label}
                  value={personalDetails.citizenOf ?? ``}
                  onChange={(value) => {
                    updatePersonal({ citizenOf: value, countryOfTaxResidence: value });
                    clearError(`citizenOf`);
                  }}
                  error={fieldErrors.citizenOf}
                  onErrorClear={() => clearError(`citizenOf`)}
                />
              );
            }
            if (key === `countryOfTaxResidence`) {
              return (
                <CountrySelect
                  key={key}
                  id={`pi-${key}`}
                  label={label}
                  value={personalDetails.countryOfTaxResidence ?? ``}
                  onChange={(value) => {
                    updatePersonal({ countryOfTaxResidence: value });
                    clearError(`countryOfTaxResidence`);
                  }}
                  error={fieldErrors.countryOfTaxResidence}
                  onErrorClear={() => clearError(`countryOfTaxResidence`)}
                />
              );
            }
            const errId = `pi-${key}-err`;
            const hasError = !!fieldErrors[key];
            const handleChange = (value: string) => {
              updatePersonal({ [key]: value });
              clearError(key);
            };
            return (
              <div key={key}>
                <label htmlFor={`pi-${key}`} className={FORM_LABEL_CLASS}>
                  {label}
                </label>
                <input
                  id={`pi-${key}`}
                  type={type}
                  inputMode={type === `tel` ? `tel` : undefined}
                  autoComplete={autoComplete}
                  value={type === `date` ? toDateOnly(personalDetails[key] ?? ``) : (personalDetails[key] ?? ``)}
                  onChange={(e) => handleChange(e.target.value)}
                  className={SIGNUP_INPUT_CLASS}
                  onFocus={() => clearError(key)}
                  aria-invalid={hasError || undefined}
                  aria-describedby={hasError ? errId : undefined}
                />
                {hasError && (
                  <p id={errId} className={FORM_ERROR_CLASS} role="alert">
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
