'use client';

import { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, `children`> {
  /** Icon element (e.g. `<PencilIcon className="h-5 w-5" />`) */
  children: ReactNode;
  /** Visual variant. Default: neutral. Danger: red for destructive actions. */
  variant?: `default` | `danger`;
  className?: string;
}

const defaultClassName = `
  min-h-11
  min-w-11
  rounded-lg
  p-2
  text-slate-600
  transition-colors
  hover:bg-slate-100
  focus:outline-hidden
  focus:ring-2
  focus:ring-primary-500
  dark:text-slate-400
  dark:hover:bg-slate-700
`;

const dangerClassName = `
  min-h-11
  min-w-11
  rounded-lg
  p-2
  text-red-600
  transition-colors
  hover:bg-red-50
  focus:outline-hidden
  focus:ring-2
  focus:ring-red-500
  dark:text-red-400
  dark:hover:bg-red-900/20
`;

/**
 * IconButton - Icon-only button with 44px touch target.
 * Use for list row actions (edit, delete, toggle).
 */
export function IconButton({ children, variant = `default`, className = ``, ...props }: IconButtonProps) {
  const variantClass = variant === `danger` ? dangerClassName : defaultClassName;
  return (
    <button type="button" className={`${variantClass.trim()} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
