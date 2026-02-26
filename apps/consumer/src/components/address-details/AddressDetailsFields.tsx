'use client';

import { CountrySelect, FormInput } from '../ui';

export interface AddressDetailsValues {
  postalCode: string;
  country: string;
  state: string;
  city: string;
  street: string;
}

export interface AddressDetailsFieldsProps {
  values: AddressDetailsValues;
  onChange: (field: keyof AddressDetailsValues, value: string) => void;
  errors?: Record<string, string>;
  onErrorClear?: (field: string) => void;
  /** Optional: called when a field blurs (e.g. to run validation). */
  onBlur?: () => void;
}

export function AddressDetailsFields({
  values,
  onChange,
  errors = {},
  onErrorClear,
  onBlur,
}: AddressDetailsFieldsProps) {
  const clearError = (field: string) => {
    onErrorClear?.(field);
  };

  return (
    <>
      <FormInput
        label="Postal code"
        value={values.postalCode}
        onChange={(v) => onChange(`postalCode`, v)}
        onBlur={onBlur}
        error={errors.postalCode}
        onErrorClear={() => clearError(`postalCode`)}
      />

      <CountrySelect
        label="Country"
        value={values.country}
        onChange={(v) => onChange(`country`, v)}
        onBlur={onBlur}
        error={errors.country}
        onErrorClear={() => clearError(`country`)}
      />

      <FormInput
        label="State / Region"
        value={values.state}
        onChange={(v) => onChange(`state`, v)}
        onBlur={onBlur}
        error={errors.state}
        onErrorClear={() => clearError(`state`)}
      />

      <FormInput
        label="City"
        value={values.city}
        onChange={(v) => onChange(`city`, v)}
        onBlur={onBlur}
        error={errors.city}
        onErrorClear={() => clearError(`city`)}
      />

      <FormInput
        label="Street"
        value={values.street}
        onChange={(v) => onChange(`street`, v)}
        onBlur={onBlur}
        error={errors.street}
        onErrorClear={() => clearError(`street`)}
      />
    </>
  );
}
