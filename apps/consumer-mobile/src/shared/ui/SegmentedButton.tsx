'use client';

import { type ReactNode } from 'react';

import { cn } from '@remoola/ui';

import styles from './SegmentedButton.module.css';

interface SegmentedButtonProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  /** Accessible label for the button */
  [`aria-label`]?: string;
}

/**
 * SegmentedButton - Toggle-style button with selected/unselected state.
 * Use for inline actions (e.g. Tags, Attach) where one of a group can appear selected.
 */
export function SegmentedButton({
  active,
  onClick,
  children,
  className = ``,
  [`aria-label`]: ariaLabel,
}: SegmentedButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(styles.base, active ? styles.active : styles.inactive, className)}
      aria-pressed={active}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}
