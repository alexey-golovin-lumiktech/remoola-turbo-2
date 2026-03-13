'use client';

import { cn } from '@remoola/ui';

import styles from './FilterChip.module.css';

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  /** Optional count badge (e.g. filter result count) */
  count?: number;
  /** Optional value for key/aria */
  value?: string;
}

/**
 * FilterChip - Toggleable filter chip with optional count badge.
 * Use in filter bars (e.g. document kind filters).
 */
export function FilterChip({ label, active, onClick, count }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(styles.base, active ? styles.active : styles.inactive)}
      aria-pressed={active}
    >
      <span className={styles.label}>{label}</span>
      {count !== undefined ? (
        <span className={cn(styles.countBadge, active ? styles.countBadgeActive : styles.countBadgeInactive)}>
          {count}
        </span>
      ) : null}
    </button>
  );
}
