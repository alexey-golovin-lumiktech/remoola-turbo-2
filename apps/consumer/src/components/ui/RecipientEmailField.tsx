'use client';

import styles from './classNames.module.css';
import { FormField } from './FormField';

const { formFieldSpacing } = styles;

export interface RecipientEmailFieldProps {
  /** Context-specific description shown under the label. Must match the form's purpose. */
  description: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  /** Optional class for the input (e.g. formInputRoundedLg). Defaults to formFieldSpacing. */
  inputClassName?: string;
}

/**
 * Reusable recipient-email field: label + context-specific description + email input.
 * Use a different `description` in each form so it matches what the form does.
 */
export function RecipientEmailField({
  description,
  value,
  onChange,
  label = `Recipient Email`,
  required = false,
  placeholder,
  inputClassName = formFieldSpacing,
}: RecipientEmailFieldProps) {
  return (
    <FormField label={label} description={description}>
      <input
        type="email"
        required={required}
        className={inputClassName}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </FormField>
  );
}
