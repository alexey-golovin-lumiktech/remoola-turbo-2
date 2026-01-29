'use client';

import styles from './classNames.module.css';

import type { ReactNode } from 'react';

export interface FormFieldProps {
  label: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, description, children, className = `` }: FormFieldProps) {
  const { formFieldDescription, formFieldLabel } = styles;
  return (
    <div className={className}>
      <label className={formFieldLabel}>{label}</label>
      {description && <p className={formFieldDescription}>{description}</p>}
      {children}
    </div>
  );
}
