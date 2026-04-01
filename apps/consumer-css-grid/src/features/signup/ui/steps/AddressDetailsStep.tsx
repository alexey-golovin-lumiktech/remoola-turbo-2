'use client';

import { useCallback, useEffect, useState } from 'react';

import { useSignupForm } from '../../SignupFormContext';
import { useSignupSteps } from '../../SignupStepsContext';
import { useSignupSubmit } from '../../useSignupSubmit';
import { parseAddressFromString } from '../../utils/parseAddressFromString';
import { addressDetailsSchema, getFieldErrors } from '../../validation';
import { CountrySelect } from '../CountrySelect';
import { SIGNUP_INPUT_CLASS } from '../inputClass';
import { PrevNextButtons } from '../PrevNextButtons';

export function AddressDetailsStep() {
  const { isBusiness, isContractorEntity, isContractorIndividual, addressDetails, entityDetails, updateAddress } =
    useSignupForm();
  const { markSubmitted, goNext } = useSignupSteps();
  const { submit, loading } = useSignupSubmit();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isEntityFlow = isBusiness || isContractorEntity;

  useEffect(() => {
    if (!isEntityFlow || !entityDetails.legalAddress.trim()) return;

    const parsed = parseAddressFromString(entityDetails.legalAddress, {
      countryHint: entityDetails.countryOfTaxResidence,
    });

    const needsPrefill =
      !addressDetails.postalCode.trim() &&
      !addressDetails.country.trim() &&
      !addressDetails.state.trim() &&
      !addressDetails.city.trim() &&
      !addressDetails.street.trim();

    const updates: Partial<typeof addressDetails> = {};
    if (needsPrefill) {
      if (parsed.postalCode) updates.postalCode = parsed.postalCode;
      if (parsed.country) updates.country = parsed.country;
      if (parsed.state) updates.state = parsed.state;
      if (parsed.city) updates.city = parsed.city;
      if (parsed.street) updates.street = parsed.street;
    }

    if (Object.keys(updates).length > 0) {
      updateAddress(updates);
    }
  }, [
    addressDetails.city,
    addressDetails.country,
    addressDetails.postalCode,
    addressDetails.state,
    addressDetails.street,
    entityDetails.countryOfTaxResidence,
    entityDetails.legalAddress,
    isEntityFlow,
    updateAddress,
  ]);

  const clearError = useCallback((field: string) => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  const handleNext = useCallback(async () => {
    const result = addressDetailsSchema.safeParse(addressDetails);
    if (!result.success) {
      setFieldErrors(getFieldErrors(result.error));
      return;
    }

    setFieldErrors({});
    markSubmitted(`address_details`);

    if (isContractorIndividual) {
      await submit();
      return;
    }

    goNext();
  }, [addressDetails, goNext, isContractorIndividual, markSubmitted, submit]);

  return (
    <div className="overflow-hidden rounded-[28px]">
      <div className="grid gap-8 border-b border-slate-100 px-6 py-6 dark:border-slate-800 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)] lg:px-8">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600 dark:text-primary-400">
              Step 3
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Address details</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Confirm the operational address that will be stored with the new consumer profile.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <CountrySelect
              id="address-country"
              label="Country"
              value={addressDetails.country}
              onChange={(value) => {
                updateAddress({ country: value });
                clearError(`country`);
              }}
              error={fieldErrors.country}
              onErrorClear={() => clearError(`country`)}
            />

            <div>
              <label
                htmlFor="address-postal"
                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Postal code
              </label>
              <input
                id="address-postal"
                value={addressDetails.postalCode}
                onChange={(event) => {
                  updateAddress({ postalCode: event.target.value });
                  clearError(`postalCode`);
                }}
                className={`${SIGNUP_INPUT_CLASS} ${fieldErrors.postalCode ? `border-red-500 ring-2 ring-red-500/20` : ``}`}
              />
              {fieldErrors.postalCode ? (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.postalCode}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="address-state"
                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                State / Region
              </label>
              <input
                id="address-state"
                value={addressDetails.state}
                onChange={(event) => {
                  updateAddress({ state: event.target.value });
                  clearError(`state`);
                }}
                className={`${SIGNUP_INPUT_CLASS} ${fieldErrors.state ? `border-red-500 ring-2 ring-red-500/20` : ``}`}
              />
              {fieldErrors.state ? (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.state}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="address-city"
                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                City
              </label>
              <input
                id="address-city"
                value={addressDetails.city}
                onChange={(event) => {
                  updateAddress({ city: event.target.value });
                  clearError(`city`);
                }}
                className={`${SIGNUP_INPUT_CLASS} ${fieldErrors.city ? `border-red-500 ring-2 ring-red-500/20` : ``}`}
              />
              {fieldErrors.city ? (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.city}</p>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="address-street"
                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Street address
              </label>
              <input
                id="address-street"
                value={addressDetails.street}
                onChange={(event) => {
                  updateAddress({ street: event.target.value });
                  clearError(`street`);
                }}
                className={`${SIGNUP_INPUT_CLASS} ${fieldErrors.street ? `border-red-500 ring-2 ring-red-500/20` : ``}`}
              />
              {fieldErrors.street ? (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{fieldErrors.street}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {isEntityFlow ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-white">Prefilled from legal address</p>
              <p className="mt-2 leading-6">
                We used the entity legal address to prefill this step. Review and correct anything before continuing.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-white">Final step for individual contractors</p>
              <p className="mt-2 leading-6">
                Once you confirm your address, we can submit the full individual contractor onboarding payload.
              </p>
            </div>
          )}
        </div>
      </div>

      <PrevNextButtons onNext={() => void handleNext()} nextLabel={loading ? `Submitting...` : undefined} />
    </div>
  );
}
