'use client';

import Select, { type SingleValue } from 'react-select';

import styles from './classNames.module.css';
import { useTheme } from '../ThemeProvider';

const { formInputFullWidth, formInputError, errorTextClass, signupStepLabel } = styles;

export interface FormSelectOption {
  value: string;
  label: string;
}

export interface FormSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FormSelectOption[];
  error?: string;
  onErrorClear?: () => void;
  placeholder?: string;
  isClearable?: boolean;
}

export function FormSelect({
  label,
  value,
  onChange,
  options,
  error,
  onErrorClear,
  placeholder = `Select...`,
  isClearable = true,
}: FormSelectProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === `dark`;
  const selectedOption = value ? (options.find((o) => o.value === value) ?? { value, label: value }) : null;

  const handleChange = (opt: SingleValue<FormSelectOption>) => {
    const v = opt?.value ?? ``;
    onChange(v);
    if (error && onErrorClear) onErrorClear();
  };

  return (
    <div>
      <label className={signupStepLabel}>{label}</label>
      <Select<FormSelectOption>
        isClearable={isClearable}
        isSearchable
        options={options}
        value={selectedOption}
        onChange={handleChange}
        placeholder={placeholder}
        filterOption={(option, input) =>
          option.label.toLowerCase().includes(input.toLowerCase()) ||
          option.value.toLowerCase().includes(input.toLowerCase())
        }
        classNames={{
          control: () => `${formInputFullWidth} ${error ? formInputError : ``} border-gray-300 dark:border-slate-600`,
        }}
        styles={{
          control: (base) => ({
            ...base,
            minHeight: 42,
            height: 42,
            padding: 0,
            backgroundColor: isDark ? `rgb(30 41 59)` : base.backgroundColor,
            borderColor: error ? `rgb(239 68 68)` : undefined,
          }),
          valueContainer: (base) => ({
            ...base,
            padding: `6px 8px`,
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
            color: isDark ? `rgb(148 163 184)` : base.color,
          }),
          menu: (base) => ({
            ...base,
            backgroundColor: isDark ? `rgb(30 41 59)` : base.backgroundColor,
          }),
          option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused ? (isDark ? `rgb(51 65 85)` : base.backgroundColor) : base.backgroundColor,
            color: isDark ? `rgb(248 250 252)` : base.color,
          }),
        }}
      />
      {error && <p className={errorTextClass}>{error}</p>}
    </div>
  );
}
