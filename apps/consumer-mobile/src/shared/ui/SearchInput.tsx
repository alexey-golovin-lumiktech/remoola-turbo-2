'use client';

import { SearchIcon } from './icons/SearchIcon';
import { XIcon } from './icons/XIcon';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = `Search...`, onClear, className = `` }: SearchInputProps) {
  const handleClear = () => {
    onChange(``);
    if (onClear) {
      onClear();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
        pointer-events-none
        absolute
        inset-y-0
        left-0
        flex
        items-center
        pl-4
      `}
      >
        <SearchIcon
          className={`
          h-5
          w-5
          text-slate-400
          dark:text-slate-500
          transition-colors
        `}
          strokeWidth={2}
        />
      </div>
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full
          min-h-11
          pl-11
          pr-12
          py-3
          text-base
          font-medium
          rounded-xl
          border-2
          border-slate-300
          bg-white
          text-slate-900
          placeholder-slate-400
          shadow-xs
          transition-all
          duration-200
          ease-out
          focus:outline-hidden
          focus:ring-2
          focus:ring-primary-500/50
          focus:border-primary-500
          focus:shadow-md
          hover:border-slate-400
          hover:shadow-sm
          dark:border-slate-700
          dark:bg-slate-800
          dark:text-slate-100
          dark:placeholder-slate-500
          dark:focus:border-primary-500
          dark:hover:border-slate-600
        `}
      />
      {value && (
        <button
          onClick={handleClear}
          className={`
            absolute
            right-3
            top-1/2
            -translate-y-1/2
            rounded-lg
            p-1.5
            text-slate-400
            transition-all
            duration-200
            hover:bg-slate-100
            hover:text-slate-600
            active:scale-95
            dark:hover:bg-slate-700
            dark:hover:text-slate-300
          `}
          aria-label="Clear search"
        >
          <XIcon className={`h-4 w-4`} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
