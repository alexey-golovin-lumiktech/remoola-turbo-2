import { type SelectHTMLAttributes, forwardRef } from 'react';

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
        className={`
          min-h-11 w-full appearance-none rounded-lg border px-4 py-2.5 text-base
          transition-colors duration-200
          bg-[length:1rem_1rem] bg-[right_0.75rem_center] bg-no-repeat
          focus:outline-hidden focus:ring-2 focus:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50
          ${
            error
              ? `border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-500 dark:border-red-700 dark:bg-red-900/10 dark:text-red-100`
              : `border-slate-300 bg-white text-slate-900 focus:border-primary-500 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white`
          }
          ${className}
        `}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
        }}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
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
