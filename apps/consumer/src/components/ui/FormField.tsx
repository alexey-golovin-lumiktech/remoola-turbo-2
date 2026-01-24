'use client';

import type { ReactNode } from 'react';

export interface FormFieldProps {
  label: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, description, children, className = '' }: FormFieldProps) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">{label}</label>
      {description && <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">{description}</p>}
      {children}
    </div>
  );
}
