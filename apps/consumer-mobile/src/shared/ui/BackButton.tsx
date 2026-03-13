'use client';

import Link from 'next/link';

import { cn } from '@remoola/ui';

import styles from './BackButton.module.css';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';

interface BackButtonProps {
  href: string;
  label?: string;
  className?: string;
}

/**
 * BackButton - Mobile-first back navigation button
 *
 * Features:
 * - 44px minimum touch target (iOS/Android guidelines)
 * - Clear visual affordance
 * - Accessible with ARIA labels
 * - Consistent styling across app
 *
 * @example
 * <BackButton href="/payments" label="Back to Payments" />
 * <BackButton href="/contacts" /> // Uses default "Back" label
 */
export function BackButton({ href, label = `Back`, className = `` }: BackButtonProps) {
  return (
    <Link href={href} className={cn(styles.root, className)} aria-label={label}>
      <ChevronLeftIcon className={styles.icon} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </Link>
  );
}
