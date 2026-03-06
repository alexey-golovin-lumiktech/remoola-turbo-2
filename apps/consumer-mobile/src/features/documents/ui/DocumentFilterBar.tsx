'use client';

import type { DocumentKind } from '../schemas';

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
 * DocumentFilterBar - Compact filter chips for mobile with counts
 * Shows active filter count and provides quick filter switching
 * Mobile-first with horizontal scroll, wraps nicely on desktop
 */
export function DocumentFilterBar({ activeFilter, onFilterChange, filterCounts }: DocumentFilterBarProps) {
  return (
    <div
      className={`
        -mx-1
        flex
        flex-wrap
        gap-2
        px-1
        py-2
        sm:flex-nowrap
        sm:overflow-x-auto
      `}
      style={{ scrollbarWidth: `thin` }}
    >
      {filters.map((filter) => {
        const isActive = activeFilter === filter.value;
        const count = filterCounts[filter.value] ?? 0;
        return (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={`
              group
              relative
              flex
              min-h-[44px]
              shrink-0
              items-center
              gap-2
              rounded-full
              px-4
              py-2
              text-sm
              font-semibold
              transition-all
              duration-200
              active:scale-95
              focus:outline-none
              focus:ring-2
              focus:ring-primary-500
              focus:ring-offset-2
              ${
                isActive
                  ? `bg-primary-600 text-white shadow-md shadow-primary-200 dark:shadow-primary-900/40`
                  : `bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 hover:shadow-sm dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700`
              }
            `}
            aria-pressed={isActive}
          >
            <span>{filter.label}</span>
            <span
              className={`
                flex
                h-5
                min-w-[20px]
                items-center
                justify-center
                rounded-full
                px-1.5
                text-xs
                font-bold
                transition-colors
                ${
                  isActive
                    ? `bg-white/20 text-white`
                    : `bg-slate-100 text-slate-600 group-hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400`
                }
              `}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
