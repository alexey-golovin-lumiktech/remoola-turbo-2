'use client';

import { FilterChip } from '../../../shared/ui/FilterChip';
import { type DocumentKind } from '../schemas';
import styles from './DocumentFilterBar.module.css';

interface DocumentFilterBarProps {
  activeFilter: DocumentKind;
  onFilterChange: (kind: DocumentKind) => void;
  filterCounts: Record<DocumentKind, number>;
}

const filters: { value: DocumentKind; label: string }[] = [
  { value: `All`, label: `All` },
  { value: `Payment`, label: `Payment` },
  { value: `Compliance`, label: `Compliance` },
  { value: `Contract`, label: `Contract` },
  { value: `General`, label: `General` },
];

/**
 * DocumentFilterBar - Compact filter chips optimized for mobile
 * 2-row grid on mobile showing all filters, wraps naturally on desktop
 * No horizontal scrolling needed
 */
export function DocumentFilterBar({ activeFilter, onFilterChange, filterCounts }: DocumentFilterBarProps) {
  return (
    <div className={styles.root}>
      <div className={styles.grid}>
        {filters.map((filter) => (
          <FilterChip
            key={filter.value}
            value={filter.value}
            label={filter.label}
            active={activeFilter === filter.value}
            onClick={() => onFilterChange(filter.value)}
            count={filterCounts[filter.value] ?? 0}
          />
        ))}
      </div>
    </div>
  );
}
