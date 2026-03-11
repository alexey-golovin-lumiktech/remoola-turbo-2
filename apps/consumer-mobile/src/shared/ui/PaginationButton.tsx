'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';

const baseClassName = `
  inline-flex
  min-h-10
  items-center
  rounded-xl
  border
  border-slate-200
  bg-white
  px-3
  py-2
  text-sm
  font-semibold
  text-slate-700
  shadow-xs
  transition-all
  hover:bg-slate-100
  active:scale-95
  focus:outline-hidden
  focus:ring-2
  focus:ring-primary-500
  dark:border-slate-700
  dark:bg-slate-800
  dark:text-slate-300
  dark:hover:bg-slate-700
`;

const disabledClassName = `
  pointer-events-none
  opacity-40
`;

interface PaginationButtonProps {
  href: string;
  disabled?: boolean;
  children: ReactNode;
  [`aria-disabled`]?: boolean;
}

/**
 * PaginationButton - Prev/Next link for pagination with consistent styling.
 * Renders as Link when not disabled; when disabled, still a Link but non-interactive (pointer-events-none, opacity-40).
 */
export function PaginationButton({
  href,
  disabled = false,
  children,
  [`aria-disabled`]: ariaDisabled,
}: PaginationButtonProps) {
  const className = `${baseClassName.trim()} ${disabled ? disabledClassName.trim() : ``}`.trim();

  return (
    <Link
      href={href}
      className={className}
      aria-disabled={ariaDisabled ?? disabled}
      onClick={(e) => {
        if (disabled) e.preventDefault();
      }}
    >
      {children}
    </Link>
  );
}
