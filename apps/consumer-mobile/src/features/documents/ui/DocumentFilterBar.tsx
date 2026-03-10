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
                min-h-12
                flex-col
                items-center
                justify-center
                gap-1.5
                rounded-xl
                px-4
                py-2.5
                text-xs
                font-bold
                transition-all
                duration-300
                active:scale-95
                focus:outline-hidden
                focus:ring-2
                focus:ring-primary-500
                focus:ring-offset-1
                sm:flex-row
                sm:gap-2.5
                sm:rounded-2xl
                sm:px-5
                sm:py-3
                sm:text-sm
                ${
                  isActive
                    ? `bg-linear-to-br from-primary-600 via-primary-700 to-primary-600 text-white shadow-xl shadow-primary-500/40 dark:shadow-primary-900/60 ring-2 ring-primary-500/30 scale-105`
                    : `bg-linear-to-br from-slate-800 via-slate-900 to-slate-800 text-slate-300 border border-slate-700/50 hover:border-slate-600 hover:shadow-lg hover:scale-[1.02] dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 dark:text-slate-300 dark:border-slate-700/50 dark:hover:border-slate-600`
                }
              `}
              aria-pressed={isActive}
            >
              <span className={`whitespace-nowrap leading-none font-extrabold`}>{filter.label}</span>
              <span
                className={`
                  flex
                  h-6
                  min-w-6
                  items-center
                  justify-center
                  rounded-full
                  px-2
                  text-xs
                  font-black
                  transition-all
                  duration-300
                  leading-none
                  shadow-md
                  ${
                    isActive
                      ? `bg-white/30 text-white backdrop-blur-xs ring-1 ring-white/20`
                      : `bg-slate-700/80 text-slate-300 group-hover:bg-slate-600 dark:bg-slate-700/80 dark:text-slate-300 dark:group-hover:bg-slate-600`
                  }
                `}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
