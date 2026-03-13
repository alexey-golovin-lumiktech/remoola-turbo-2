'use client';

import Select, { type SingleValue } from 'react-select';

import { cn } from '@remoola/ui';

import styles from './CountrySelect.module.css';
import { FORM_ERROR_CLASS, FORM_LABEL_CLASS } from './form-classes';
import { useTheme } from './ThemeProvider';
import { getCountryOptions } from '../../lib/countries';

export interface CountrySelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  onErrorClear?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  id?: string;
  /** Optional class for the wrapper (e.g. for signup step spacing) */
  className?: string;
}

const options = getCountryOptions();

export function CountrySelect({
  label,
  value,
  onChange,
  error,
  onErrorClear,
  onBlur,
  placeholder = `Select or search country...`,
  id,
  className = ``,
}: CountrySelectProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === `dark`;
  const selectedOption = value ? (options.find((o) => o.value === value) ?? { value, label: value }) : null;

  const handleChange = (opt: SingleValue<{ value: string; label: string }>) => {
    const v = opt?.value ?? ``;
    onChange(v);
    if (error && onErrorClear) onErrorClear();
  };

  return (
    <div className={className}>
      <label htmlFor={id} className={FORM_LABEL_CLASS}>
        {label}
      </label>
      <Select<{ value: string; label: string }>
        inputId={id}
        isClearable
        isSearchable
        options={options}
        value={selectedOption}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        filterOption={(option, input) =>
          option.label.toLowerCase().includes(input.toLowerCase()) ||
          option.value.toLowerCase().includes(input.toLowerCase())
        }
        classNames={{
          control: () => cn(styles.control, error && styles.controlError),
        }}
        styles={{
          control: (base) => ({
            ...base,
            minHeight: 44,
            height: 44,
            padding: 0,
            backgroundColor: isDark ? `rgb(38 38 38)` : base.backgroundColor,
            borderColor: error ? `rgb(239 68 68)` : undefined,
          }),
          valueContainer: (base) => ({
            ...base,
            padding: `8px 12px`,
          }),
          singleValue: (base) => ({
            ...base,
            color: isDark ? `rgb(248 250 252)` : base.color,
          }),
          input: (base) => ({
            ...base,
            color: isDark ? `rgb(248 250 252)` : base.color,
          }),
          placeholder: (base) => ({
            ...base,
            color: isDark ? `rgb(163 163 163)` : base.color,
          }),
          menu: (base) => ({
            ...base,
            backgroundColor: isDark ? `rgb(38 38 38)` : base.backgroundColor,
          }),
          option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused ? (isDark ? `rgb(64 64 64)` : base.backgroundColor) : base.backgroundColor,
            color: isDark ? `rgb(248 250 252)` : base.color,
          }),
        }}
      />
      {error ? (
        <p className={FORM_ERROR_CLASS} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
