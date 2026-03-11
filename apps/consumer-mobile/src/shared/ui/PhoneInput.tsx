'use client';

import 'react-phone-number-input/style.css';
import dynamic from 'next/dynamic';
import { type Country } from 'react-phone-number-input';

import { getCountryCode } from '../../lib/countries';

const PhoneInputWithCountry = dynamic(() => import(`react-phone-number-input`).then((mod) => mod.default), {
  ssr: false,
});

const labelClass = `mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300`;
const errorClass = `mt-1 text-sm text-red-600 dark:text-red-400`;

const phoneInputWrapperClass =
  `min-h-11 w-full rounded-lg border border-neutral-300 px-3 py-2 text-base text-neutral-900 ` +
  `focus-within:outline-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 ` +
  `dark:border-neutral-600 dark:bg-neutral-800 dark:text-white ` +
  `dark:focus-within:ring-primary-400 dark:focus-within:border-primary-400`;

const phoneInputWrapperErrorClass = `border-red-500 ring-2 ring-red-500/20 dark:border-red-500`;

export interface PhoneInputProps {
  label: string;
  value: string;
  onChange: (value: string | undefined) => void;
  error?: string;
  onErrorClear?: () => void;
  /** Country name (e.g. from Country of tax residence) to set default country code */
  defaultCountryName?: string;
  placeholder?: string;
  id?: string;
}

export function PhoneInput({
  label,
  value,
  onChange,
  error,
  onErrorClear,
  defaultCountryName,
  placeholder = `Enter phone number`,
  id,
}: PhoneInputProps) {
  const defaultCountry = (defaultCountryName ? getCountryCode(defaultCountryName) : undefined) as Country | undefined;

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <PhoneInputWithCountry
        international
        defaultCountry={defaultCountry}
        value={value || undefined}
        onChange={(v) => {
          onChange(v ?? undefined);
          if (error && onErrorClear) onErrorClear();
        }}
        placeholder={placeholder}
        className={`${phoneInputWrapperClass} ${error ? phoneInputWrapperErrorClass : ``}`}
      />
      {error && (
        <p className={errorClass} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
