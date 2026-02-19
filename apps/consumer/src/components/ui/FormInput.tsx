'use client';

import { type InputHTMLAttributes, forwardRef } from 'react';

import styles from './classNames.module.css';

const { formInputFullWidth, formInputError } = styles;

const joinClasses = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(` `);

export interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, `onChange`> {
  label: string;
  error?: string;
  onChange?: (value: string) => void;
  onErrorClear?: () => void;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, onChange, onErrorClear, className, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
      // Clear error when user starts typing (only if there was an error)
      if (error && onErrorClear && e.target.value.length > 0) {
        onErrorClear();
      }
    };

    return (
      <div>
        <label className={styles.signupStepLabel}>{label}</label>
        <input
          ref={ref}
          {...props}
          onChange={handleChange}
          className={joinClasses(formInputFullWidth, error && formInputError, className)}
        />
      </div>
    );
  },
);

FormInput.displayName = `FormInput`;
