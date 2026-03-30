'use client';

import { type ChangeEvent, type InputHTMLAttributes, forwardRef, useId } from 'react';

import { cn } from '@remoola/ui';

import styles from './classNames.module.css';

const { formInputFullWidth, formInputError } = styles;

export interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, `onChange`> {
  label: string;
  error?: string;
  onChange?: (value: string) => void;
  onErrorClear?: () => void;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, onChange, onErrorClear, className, id: providedId, ...props }, ref) => {
    const generatedId = useId();
    const inputId = providedId ?? generatedId;

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
      // Clear error when user starts typing (only if there was an error)
      if (error && onErrorClear && e.target.value.length > 0) {
        onErrorClear();
      }
    };

    return (
      <div>
        <label htmlFor={inputId} className={styles.signupStepLabel}>
          {label}
        </label>
        <input
          ref={ref}
          {...props}
          id={inputId}
          onChange={handleChange}
          className={cn(formInputFullWidth, error && formInputError, className)}
        />
      </div>
    );
  },
);

FormInput.displayName = `FormInput`;
