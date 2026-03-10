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
          min-h-11 w-full rounded-xl border-2 px-4 py-3 text-base font-medium
          transition-all duration-200 ease-out
          placeholder:text-slate-400 dark:placeholder:text-slate-500
          focus:outline-hidden focus:ring-2 focus:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-slate-50 dark:disabled:bg-slate-900
          ${
            error
              ? `border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-500/50 dark:border-red-700 dark:bg-red-900/10 dark:text-red-100`
              : `border-slate-300 bg-white text-slate-900 focus:border-primary-500 focus:ring-primary-500/50 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:border-slate-500`
          }
          ${className}
        `}
        {...props}
      />
    );
  },
);

FormInput.displayName = `FormInput`;
