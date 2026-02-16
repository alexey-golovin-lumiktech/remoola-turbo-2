'use client';

import dynamic from 'next/dynamic';
import 'react-phone-number-input/style.css';

import styles from './classNames.module.css';
import { getCountryCode } from '../../lib/countries';

import type { Country } from 'react-phone-number-input';

const { formInputFullWidth, errorTextClass, signupStepLabel } = styles;

const PhoneInputWithCountry = dynamic(() => import(`react-phone-number-input`).then((mod) => mod.default), {
  ssr: false,
});

export interface PhoneInputProps {
  label: string;
  value: string;
  onChange: (value: string | undefined) => void;
  error?: string;
  onErrorClear?: () => void;
  /** Country name (e.g. from Country of tax residence) to set default country code */
  defaultCountryName?: string;
  placeholder?: string;
}

export function PhoneInput({
  label,
  value,
  onChange,
  error,
  onErrorClear,
  defaultCountryName,
  placeholder = `Enter phone number`,
}: PhoneInputProps) {
  const defaultCountry = (defaultCountryName ? getCountryCode(defaultCountryName) : undefined) as Country | undefined;

  return (
    <div>
      <label className={signupStepLabel}>{label}</label>
      <PhoneInputWithCountry
        international
        defaultCountry={defaultCountry}
        value={value || undefined}
        onChange={(v) => {
          onChange(v ?? undefined);
          if (error && onErrorClear) onErrorClear();
        }}
        placeholder={placeholder}
        className={formInputFullWidth}
      />
      {error && <p className={errorTextClass}>{error}</p>}
    </div>
  );
}
