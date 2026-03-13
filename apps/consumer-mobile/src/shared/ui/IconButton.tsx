'use client';

import { type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@remoola/ui';

import styles from './IconButton.module.css';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, `children`> {
  /** Icon element (e.g. `<PencilIcon className="h-5 w-5" />`) */
  children: ReactNode;
  /** Visual variant. Default: neutral. Danger: red for destructive actions. */
  variant?: `default` | `danger`;
  className?: string;
}

/**
 * IconButton - Icon-only button with 44px touch target.
 * Use for list row actions (edit, delete, toggle).
 */
export function IconButton({ children, variant = `default`, className = ``, ...props }: IconButtonProps) {
  return (
    <button type="button" className={cn(variant === `danger` ? styles.danger : styles.base, className)} {...props}>
      {children}
    </button>
  );
}
