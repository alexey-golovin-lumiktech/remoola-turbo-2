import { type SelectHTMLAttributes, forwardRef } from 'react';

import { cn } from '@remoola/ui';

import styles from './FormSelect.module.css';

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
}

/**
 * FormSelect - Styled select component with error state support
 * Follows mobile-first design with proper touch targets (min-height: 44px)
 */
export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ error = false, options, placeholder, className = ``, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(styles.base, error ? styles.error : styles.default, className)}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
        }}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    );
  },
);

FormSelect.displayName = `FormSelect`;
