import { type ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * FormField - Wrapper component for form inputs with label, error, and hint support
 * Follows mobile-first design with proper touch targets and accessibility
 */
export function FormField({ label, htmlFor, error, hint, required = false, children, className = `` }: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-900 dark:text-white">
        {label}
        {required && (
          <span className="ml-1 text-red-600 dark:text-red-400" aria-label="required">
            *
          </span>
        )}
      </label>

      {children}

      {hint && !error && (
        <p className="text-xs text-slate-500 dark:text-slate-400" id={`${htmlFor}-hint`}>
          {hint}
        </p>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400" id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
