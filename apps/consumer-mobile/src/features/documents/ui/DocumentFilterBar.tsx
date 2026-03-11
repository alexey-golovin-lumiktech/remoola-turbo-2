'use client';

import { FilterChip } from '../../../shared/ui/FilterChip';
import { type DocumentKind } from '../schemas';

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
    <div className={`w-full`}>
      <div
        className={`
          grid
          grid-cols-3
          gap-2.5
          py-2
          sm:flex
          sm:flex-wrap
          sm:gap-3
        `}
      >
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
