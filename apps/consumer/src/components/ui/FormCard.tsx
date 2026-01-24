'use client';

import type { ComponentPropsWithoutRef, ReactNode } from 'react';

const baseClasses =
  'space-y-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 shadow-sm';

export interface FormCardProps extends ComponentPropsWithoutRef<'form'> {
  title?: ReactNode;
  description?: ReactNode;
}

export function FormCard({ title, description, children, className = '', ...props }: FormCardProps) {
  return (
    <form {...props} className={`${baseClasses} ${className}`.trim()}>
      {title && <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>}
      {description && <p className="text-sm text-gray-600 dark:text-slate-300">{description}</p>}
      {children}
    </form>
  );
}
