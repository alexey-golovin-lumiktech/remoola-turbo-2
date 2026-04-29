'use client';

import dynamic from 'next/dynamic';
import { type Country } from 'react-phone-number-input';

import { cn } from '@remoola/ui';

import { getCountryCode } from './countries';
import { FORM_ERROR_CLASS, FORM_LABEL_CLASS } from './form-classes';
import styles from './PhoneInput.module.css';

const PhoneInputWithCountry = dynamic(() => import(`react-phone-number-input`).then((module) => module.default), {
  ssr: false,
});

interface PhoneInputProps {
  label: string;
  value: string;
  onChange: (value: string | undefined) => void;
  error?: string;
  onErrorClear?: () => void;
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
        onChange={(nextValue) => {
          onChange(nextValue ?? undefined);
          if (error && onErrorClear) {
            onErrorClear();
          }
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
