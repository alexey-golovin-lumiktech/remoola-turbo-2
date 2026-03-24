'use client';

import dynamic from 'next/dynamic';
import { type Country } from 'react-phone-number-input';

import { cn } from '@remoola/ui';

import { FORM_ERROR_CLASS, FORM_LABEL_CLASS } from './form-classes';
import styles from './PhoneInput.module.css';
import { getCountryCode } from '../../lib/countries';

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
      <label htmlFor={id} className={FORM_LABEL_CLASS}>
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
        className={cn(styles.wrapper, error && styles.wrapperError)}
      />
      {error ? (
        <p className={FORM_ERROR_CLASS} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
