'use client';

import { useCallback, useState } from 'react';

import { LEGAL_STATUS } from '@remoola/api-types';

import { useSignupForm } from '../../SignupFormContext';
import { useSignupSteps } from '../../SignupStepsContext';
import { getFieldErrors, individualDetailsSchema } from '../../validation';
import { CountrySelect } from '../CountrySelect';
import { SIGNUP_INPUT_CLASS } from '../inputClass';
import { PhoneInput } from '../PhoneInput';
import { PrevNextButtons } from '../PrevNextButtons';

export function IndividualDetailsStep() {
  const { individualDetails, updateIndividual } = useSignupForm();
  const { markSubmitted, goNext } = useSignupSteps();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearError = useCallback((field: string) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  const handleNext = useCallback(() => {
    const result = individualDetailsSchema.safeParse(individualDetails);
    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      return;
    }
    setFieldErrors({});
    markSubmitted(`individual_details`);
    goNext();
  }, [goNext, individualDetails, markSubmitted]);

  return (
    <div className="overflow-hidden rounded-[28px]">
      <div className="grid gap-8 border-b border-slate-100 px-6 py-6 dark:border-slate-800 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)] lg:px-8">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600 dark:text-primary-400">
              Step 2
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Personal contractor details
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              We use these details to build your individual contractor profile and validate the onboarding path.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="individual-first-name"
                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                First name
              </label>
              <input
                id="individual-first-name"
                value={individualDetails.firstName}
                onChange={(event) => {
                  updateIndividual({ firstName: event.target.value });
                  clearError(`firstName`);
                }}
                className={`${SIGNUP_INPUT_CLASS} ${fieldErrors.firstName ? `border-red-500 ring-2 ring-red-500/20` : ``}`}
              />
              {fieldErrors.firstName ? (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.firstName}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="individual-last-name"
                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Last name
              </label>
              <input
                id="individual-last-name"
                value={individualDetails.lastName}
                onChange={(event) => {
                  updateIndividual({ lastName: event.target.value });
                  clearError(`lastName`);
                }}
                className={`${SIGNUP_INPUT_CLASS} ${fieldErrors.lastName ? `border-red-500 ring-2 ring-red-500/20` : ``}`}
              />
              {fieldErrors.lastName ? (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.lastName}</p>
              ) : null}
            </div>

            <CountrySelect
              id="individual-citizenship"
              label="Citizenship"
              value={individualDetails.citizenOf}
              onChange={(value) => {
                updateIndividual({
                  citizenOf: value,
                  countryOfTaxResidence: individualDetails.countryOfTaxResidence || value,
                });
                clearError(`citizenOf`);
              }}
              error={fieldErrors.citizenOf}
              onErrorClear={() => clearError(`citizenOf`)}
            />

            <CountrySelect
              id="individual-tax-country"
              label="Country of tax residence"
              value={individualDetails.countryOfTaxResidence}
              onChange={(value) => {
                updateIndividual({ countryOfTaxResidence: value });
                clearError(`countryOfTaxResidence`);
              }}
              error={fieldErrors.countryOfTaxResidence}
              onErrorClear={() => clearError(`countryOfTaxResidence`)}
            />

            <div>
              <label
                htmlFor="individual-date-of-birth"
                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Date of birth
              </label>
              <input
                id="individual-date-of-birth"
                type="date"
                value={individualDetails.dateOfBirth}
                onChange={(event) => {
                  updateIndividual({ dateOfBirth: event.target.value });
                  clearError(`dateOfBirth`);
                }}
                className={`${SIGNUP_INPUT_CLASS} ${fieldErrors.dateOfBirth ? `border-red-500 ring-2 ring-red-500/20` : ``}`}
              />
              {fieldErrors.dateOfBirth ? (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.dateOfBirth}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="individual-legal-status"
                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Legal status
              </label>
              <select
                id="individual-legal-status"
                value={individualDetails.legalStatus ?? ``}
                onChange={(event) => {
                  updateIndividual({
                    legalStatus: event.target.value
                      ? (event.target.value as typeof individualDetails.legalStatus)
                      : null,
                  });
                  clearError(`legalStatus`);
                }}
                className={`${SIGNUP_INPUT_CLASS} ${fieldErrors.legalStatus ? `border-red-500 ring-2 ring-red-500/20` : ``}`}
              >
                <option value="" disabled>
                  Select legal status...
                </option>
                {Object.values(LEGAL_STATUS).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              {fieldErrors.legalStatus ? (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.legalStatus}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="individual-tax-id"
                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Tax ID
              </label>
              <input
                id="individual-tax-id"
                value={individualDetails.taxId}
                onChange={(event) => {
                  updateIndividual({ taxId: event.target.value });
                  clearError(`taxId`);
                }}
                className={`${SIGNUP_INPUT_CLASS} ${fieldErrors.taxId ? `border-red-500 ring-2 ring-red-500/20` : ``}`}
              />
              {fieldErrors.taxId ? (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.taxId}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="individual-passport"
                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Passport or ID number
              </label>
              <input
                id="individual-passport"
                value={individualDetails.passportOrIdNumber}
                onChange={(event) => {
                  updateIndividual({ passportOrIdNumber: event.target.value });
                  clearError(`passportOrIdNumber`);
                }}
                className={`${SIGNUP_INPUT_CLASS} ${
                  fieldErrors.passportOrIdNumber ? `border-red-500 ring-2 ring-red-500/20` : ``
                }`}
              />
              {fieldErrors.passportOrIdNumber ? (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.passportOrIdNumber}</p>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <PhoneInput
                id="individual-phone"
                label="Phone number"
                value={individualDetails.phoneNumber}
                onChange={(value) => updateIndividual({ phoneNumber: value ?? `` })}
                error={fieldErrors.phoneNumber}
                onErrorClear={() => clearError(`phoneNumber`)}
                defaultCountryName={individualDetails.countryOfTaxResidence || undefined}
                placeholder="+1 555 123 4567"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <p className="font-semibold text-slate-900 dark:text-white">Validation rules</p>
            <ul className="mt-2 space-y-2 leading-6">
              <li>You must be at least 18 years old.</li>
              <li>Phone number is validated in international format.</li>
              <li>Tax ID gets a basic sanity check before submit.</li>
            </ul>
          </div>
        </div>
      </div>

      <PrevNextButtons onNext={handleNext} />
    </div>
  );
}
