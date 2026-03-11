'use client';

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  /** Optional count badge (e.g. filter result count) */
  count?: number;
  /** Optional value for key/aria */
  value?: string;
}

const activeClassName = `
  bg-linear-to-br
  from-primary-600
  via-primary-700
  to-primary-600
  text-white
  shadow-xl
  shadow-primary-500/40
  dark:shadow-primary-900/60
  ring-2
  ring-primary-500/30
  scale-105
`;

const inactiveClassName = `
  border
  border-slate-200
  bg-linear-to-br
  from-slate-100
  via-white
  to-slate-100
  text-slate-700
  hover:border-slate-300
  hover:shadow-lg
  hover:scale-[1.02]
  dark:border-slate-700/50
  dark:from-slate-800
  dark:via-slate-900
  dark:to-slate-800
  dark:text-slate-300
  dark:hover:border-slate-600
`;

/**
 * FilterChip - Toggleable filter chip with optional count badge.
 * Use in filter bars (e.g. document kind filters).
 */
export function FilterChip({ label, active, onClick, count }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
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
        ${active ? activeClassName.trim() : inactiveClassName.trim()}
      `}
      aria-pressed={active}
    >
      <span className={`whitespace-nowrap leading-none font-extrabold`}>{label}</span>
      {count !== undefined && (
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
              active
                ? `bg-white/30 text-white backdrop-blur-xs ring-1 ring-white/20`
                : `bg-slate-200 text-slate-700 group-hover:bg-slate-300 dark:bg-slate-700/80 dark:text-slate-300 dark:group-hover:bg-slate-600`
            }
          `}
        >
          {count}
        </span>
      )}
    </button>
  );
}
