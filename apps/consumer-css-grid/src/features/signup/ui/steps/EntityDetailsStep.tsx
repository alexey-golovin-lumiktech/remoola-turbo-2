'use client';

import { useCallback, useState } from 'react';

import { getAssistiveAddressPrefill } from '../../assistivePrefill';
import { useSignupForm } from '../../SignupFormContext';
import { useSignupSteps } from '../../SignupStepsContext';
import { parseAddressFromString } from '../../utils/parseAddressFromString';
import { entityDetailsSchema, getFieldErrors } from '../../validation';
import { CountrySelect } from '../CountrySelect';
import { SIGNUP_INPUT_CLASS } from '../inputClass';
import { PhoneInput } from '../PhoneInput';
import { PrevNextButtons } from '../PrevNextButtons';

export function EntityDetailsStep() {
  const { entityDetails, addressDetails, updateEntity, updateAddress } = useSignupForm();
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

  const handleLegalAddressChange = useCallback(
    (value: string) => {
      updateEntity({ legalAddress: value });
      if (!value.trim()) return;

      const parsed = parseAddressFromString(value, {
        countryHint: entityDetails.countryOfTaxResidence,
      });

      const updates = getAssistiveAddressPrefill(addressDetails, parsed);
      if (Object.keys(updates).length > 0) {
        updateAddress(updates);
      }
      if (!entityDetails.countryOfTaxResidence.trim() && parsed.country) {
        updateEntity({ countryOfTaxResidence: parsed.country });
      }
    },
    [addressDetails, entityDetails.countryOfTaxResidence, updateAddress, updateEntity],
  );

  const handleNext = useCallback(() => {
    const result = entityDetailsSchema.safeParse(entityDetails);
    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      return;
    }
    setFieldErrors({});
    markSubmitted(`entity_details`);
    goNext();
  }, [entityDetails, goNext, markSubmitted]);

  return (
    <div className="overflow-hidden rounded-[28px]">
      <div className="grid gap-8 border-b border-slate-100 px-6 py-6 dark:border-slate-800 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)] lg:px-8">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600 dark:text-primary-400">
              Step 2
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Entity details</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              These details power the entity or business signup branch and prefill the address step automatically.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <CountrySelect
              id="entity-tax-country"
              label="Country of tax residence"
              value={entityDetails.countryOfTaxResidence}
              onChange={(value) => {
                updateEntity({ countryOfTaxResidence: value });
                clearError(`countryOfTaxResidence`);
              }}
              error={fieldErrors.countryOfTaxResidence}
              onErrorClear={() => clearError(`countryOfTaxResidence`)}
            />

            <div>
              <label
                htmlFor="entity-tax-id"
                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Tax ID
              </label>
              <input
                id="entity-tax-id"
                value={entityDetails.taxId}
                onChange={(event) => {
                  updateEntity({ taxId: event.target.value });
                  clearError(`taxId`);
                }}
                className={`${SIGNUP_INPUT_CLASS} ${fieldErrors.taxId ? `border-red-500 ring-2 ring-red-500/20` : ``}`}
              />
              {fieldErrors.taxId ? (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.taxId}</p>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <PhoneInput
                id="entity-phone"
                label="Phone number"
                value={entityDetails.phoneNumber}
                onChange={(value) => updateEntity({ phoneNumber: value ?? `` })}
                error={fieldErrors.phoneNumber}
                onErrorClear={() => clearError(`phoneNumber`)}
                defaultCountryName={entityDetails.countryOfTaxResidence || undefined}
                placeholder="+1 555 123 4567"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="entity-legal-address"
                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Legal address
              </label>
              <textarea
                id="entity-legal-address"
                value={entityDetails.legalAddress}
                onChange={(event) => {
                  handleLegalAddressChange(event.target.value);
                  clearError(`legalAddress`);
                }}
                className={`${SIGNUP_INPUT_CLASS} min-h-28 ${
                  fieldErrors.legalAddress ? `border-red-500 ring-2 ring-red-500/20` : ``
                }`}
                placeholder="15 Central Park W Apt 7P, New York, NY 10023"
              />
              {fieldErrors.legalAddress ? (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.legalAddress}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <p className="font-semibold text-slate-900 dark:text-white">Smart address parsing</p>
            <p className="mt-2 leading-6">
              We parse the legal address to prefill country, region, city, postal code, and normalized street details in
              the next step.
            </p>
          </div>
        </div>
      </div>

      <PrevNextButtons onNext={handleNext} />
    </div>
  );
}
