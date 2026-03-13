import { type InputHTMLAttributes, forwardRef } from 'react';

import { cn } from '@remoola/ui';

import styles from './FormInput.module.css';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

/**
 * FormInput - Styled input component with error state support
 * Follows mobile-first design with proper touch targets (min-height: 44px)
 */
export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ error = false, className = ``, ...props }, ref) => {
    return <input ref={ref} className={cn(styles.base, error ? styles.error : styles.default, className)} {...props} />;
  },
);

FormInput.displayName = `FormInput`;
