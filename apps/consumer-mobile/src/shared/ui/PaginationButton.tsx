'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';

import { cn } from '@remoola/ui';

import styles from './PaginationButton.module.css';

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
  return (
    <Link
      href={href}
      className={cn(styles.base, disabled && styles.disabled)}
      aria-disabled={ariaDisabled ?? disabled}
      onClick={(e) => {
        if (disabled) e.preventDefault();
      }}
    >
      {children}
    </Link>
  );
}
