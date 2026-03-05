'use client';

import type { DocumentKind } from '../schemas';

interface DocumentFilterBarProps {
  activeFilter: DocumentKind;
  onFilterChange: (kind: DocumentKind) => void;
}

const filters: { value: DocumentKind; label: string }[] = [
  { value: `All`, label: `All` },
  { value: `Payment`, label: `Payment` },
  { value: `Compliance`, label: `Compliance` },
  { value: `Contract`, label: `Contract` },
  { value: `General`, label: `General` },
];

/**
 * DocumentFilterBar - Compact filter chips for mobile
 * Shows active filter count and provides quick filter switching
 */
export function DocumentFilterBar({ activeFilter, onFilterChange }: DocumentFilterBarProps) {
  return (
    <div
      className={`
        flex
        gap-2
        overflow-x-auto
        pb-2
        scrollbar-thin
        scrollbar-thumb-slate-300
        scrollbar-track-transparent
        dark:scrollbar-thumb-slate-600
      `}
    >
      {filters.map((filter) => {
        const isActive = activeFilter === filter.value;
        return (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={`
              min-h-[44px]
              shrink-0
              rounded-lg
              px-4
              py-2
              text-sm
              font-medium
              transition-all
              duration-200
              focus:outline-none
              focus:ring-2
              focus:ring-primary-500
              focus:ring-offset-2
              ${
                isActive
                  ? `bg-primary-600 text-white shadow-md`
                  : `bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700`
              }
            `}
            aria-pressed={isActive}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
