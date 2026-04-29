'use client';

import Select, { type SingleValue } from 'react-select';

import { cn } from '@remoola/ui';

import { getCountryOptions } from './countries';
import styles from './CountrySelect.module.css';
import { FORM_ERROR_CLASS, FORM_LABEL_CLASS } from './form-classes';

interface CountrySelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  onErrorClear?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  id?: string;
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
  const selectedOption = value ? (options.find((option) => option.value === value) ?? { value, label: value }) : null;

  const handleChange = (option: SingleValue<{ value: string; label: string }>) => {
    const nextValue = option?.value ?? ``;
    onChange(nextValue);
    if (error && onErrorClear) {
      onErrorClear();
    }
  };

  return (
    <div className={className}>
      <label htmlFor={id} className={FORM_LABEL_CLASS}>
        {label}
      </label>
      <Select<{ value: string; label: string }>
        inputId={id}
        unstyled
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
          control: (selectState) =>
            cn(styles.control, selectState.isFocused && styles.controlFocused, error && styles.controlError) ?? ``,
          valueContainer: () => styles.valueContainer ?? ``,
          placeholder: () => styles.placeholder ?? ``,
          input: () => styles.input ?? ``,
          singleValue: () => styles.singleValue ?? ``,
          indicatorsContainer: () => styles.indicatorsContainer ?? ``,
          clearIndicator: () => styles.indicatorButton ?? ``,
          dropdownIndicator: () => styles.indicatorButton ?? ``,
          menu: () => styles.menu ?? ``,
          menuList: () => styles.menuList ?? ``,
          option: (optionState) =>
            cn(
              styles.option,
              optionState.isSelected ? styles.optionSelected : styles.optionIdle,
              optionState.isFocused && !optionState.isSelected && styles.optionFocused,
              optionState.isDisabled && styles.optionDisabled,
            ) ?? ``,
          noOptionsMessage: () => styles.message ?? ``,
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
