import { type TextareaHTMLAttributes, forwardRef } from 'react';

import { cn } from '@remoola/ui';

import styles from './FormTextarea.module.css';

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

/**
 * FormTextarea - Styled textarea component with error state support
 * Follows mobile-first design with proper touch targets
 */
export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ error = false, className = ``, ...props }, ref) => {
    return (
      <textarea ref={ref} className={cn(styles.base, error ? styles.error : styles.default, className)} {...props} />
    );
  },
);

FormTextarea.displayName = `FormTextarea`;
