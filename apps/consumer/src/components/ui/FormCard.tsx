'use client';

import { formCardBase, formCardDescription, formCardTitle } from './classNames';

import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export interface FormCardProps extends ComponentPropsWithoutRef<`form`> {
  title?: any;
  description?: ReactNode;
}

export function FormCard({ title, description, children, className = ``, ...props }: FormCardProps) {
  return (
    <form {...props} className={`${formCardBase} ${className}`.trim()}>
      {title && <h2 className={formCardTitle}>{title}</h2>}
      {description && <p className={formCardDescription}>{description}</p>}
      {children}
    </form>
  );
}
