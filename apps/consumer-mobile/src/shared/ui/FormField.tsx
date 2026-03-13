import { type ReactNode } from 'react';

import { cn } from '@remoola/ui';

import styles from './FormField.module.css';

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
    <div className={cn(styles.root, className)}>
      <label htmlFor={htmlFor} className={styles.label}>
        {label}
        {required ? (
          <span className={styles.required} aria-label="required">
            *
          </span>
        ) : null}
      </label>

      {children}

      {hint && !error ? (
        <p className={styles.hint} id={`${htmlFor}-hint`}>
          {hint}
        </p>
      ) : null}

      {error ? (
        <p className={styles.error} id={`${htmlFor}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
