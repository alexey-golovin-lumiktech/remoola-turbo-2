import { type InputHTMLAttributes, forwardRef } from 'react';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

/**
 * FormInput - Styled input component with error state support
 * Follows mobile-first design with proper touch targets (min-height: 44px)
 */
export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ error = false, className = ``, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`
          min-h-[44px] w-full rounded-lg border px-4 py-2.5 text-base
          transition-colors duration-200
          placeholder:text-slate-400 dark:placeholder:text-slate-500
          focus:outline-none focus:ring-2 focus:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50
          ${
            error
              ? `border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-500 dark:border-red-700 dark:bg-red-900/10 dark:text-red-100`
              : `border-slate-300 bg-white text-slate-900 focus:border-primary-500 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white`
          }
          ${className}
        `}
        {...props}
      />
    );
  },
);

FormInput.displayName = `FormInput`;
