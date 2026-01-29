'use client';

import styles from './classNames.module.css';

import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export interface FormCardProps extends ComponentPropsWithoutRef<`form`> {
  title?: any;
  description?: ReactNode;
}

export function FormCard({ title, description, children, className = ``, ...props }: FormCardProps) {
  const { formCardBase, formCardDescription, formCardTitle } = styles;
  return (
    <form {...props} className={`${formCardBase} ${className}`.trim()}>
      {title && <h2 className={formCardTitle}>{title}</h2>}
      {description && <p className={formCardDescription}>{description}</p>}
      {children}
    </form>
  );
}
