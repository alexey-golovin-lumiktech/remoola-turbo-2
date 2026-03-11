'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { CheckIcon } from './icons/CheckIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { Theme, useTheme, type ITheme } from './ThemeProvider';

const themeLabels: Record<ITheme, string> = {
  [Theme.LIGHT]: `Light`,
  [Theme.DARK]: `Dark`,
  [Theme.SYSTEM]: `System`,
};

const themeDescriptions: Record<ITheme, string> = {
  [Theme.LIGHT]: `Always light`,
  [Theme.DARK]: `Always dark`,
  [Theme.SYSTEM]: `Follow device`,
};

function SunIcon({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden
    >
      <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  );
}

function SystemIcon({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function ThemeTriggerIcon({ theme }: { theme: ITheme }) {
  if (theme === Theme.SYSTEM) return <SystemIcon />;
  return theme === Theme.DARK ? <MoonIcon /> : <SunIcon />;
}

function OptionIcon({ option }: { option: ITheme }) {
  if (option === Theme.LIGHT) return <SunIcon size={18} className={`shrink-0 text-amber-500`} />;
  if (option === Theme.DARK) return <MoonIcon size={18} className={`shrink-0 text-indigo-400`} />;
  return <SystemIcon size={18} className={`shrink-0 text-slate-500 dark:text-slate-400`} />;
}

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [persisting, setPersisting] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const persistTheme = useCallback(
    async (newTheme: ITheme) => {
      setTheme(newTheme);
      setOpen(false);
      setDropdownPosition(null);
      setPersisting(true);
      try {
        await fetch(`/api/settings/theme`, {
          method: `PUT`,
          headers: { 'content-type': `application/json` },
          credentials: `include`,
          body: JSON.stringify({ theme: newTheme.toUpperCase() }),
        });
      } finally {
        setPersisting(false);
      }
    },
    [setTheme],
  );

  useLayoutEffect(() => {
    if (open && containerRef.current && typeof document !== `undefined`) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        right: document.documentElement.clientWidth - rect.right,
      });
    } else if (!open) {
      setDropdownPosition(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
      setDropdownPosition(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === `Escape`) {
        setOpen(false);
        setDropdownPosition(null);
        containerRef.current?.querySelector(`button`)?.focus();
      }
    };
    document.addEventListener(`click`, handleClick);
    document.addEventListener(`keydown`, handleKeyDown);
    return () => {
      document.removeEventListener(`click`, handleClick);
      document.removeEventListener(`keydown`, handleKeyDown);
    };
  }, [open]);

  const dropdownContent = open && dropdownPosition && typeof document !== `undefined` && (
    <div
      ref={dropdownRef}
      role="listbox"
      aria-label="Theme options"
      className={`
        fixed
        z-[9999]
        mt-0
        min-w-44
        overflow-hidden
        rounded-xl
        border
        border-slate-200
        bg-white
        py-1.5
        shadow-xl
        ring-1
        ring-slate-900/5
        transition-all
        duration-200
        ease-out
        dark:border-slate-600
        dark:bg-slate-800
        dark:ring-white/5
      `}
      style={{
        top: dropdownPosition.top,
        right: dropdownPosition.right,
      }}
    >
      {([Theme.LIGHT, Theme.DARK, Theme.SYSTEM] as const).map((option) => {
        const isActive = theme === option;
        return (
          <button
            key={option}
            type="button"
            role="option"
            aria-selected={isActive}
            onClick={() => persistTheme(option)}
            className={`
              flex
              w-full
              min-h-11
              items-center
              justify-between
              gap-3
              px-4
              py-2.5
              text-left
              text-sm
              font-medium
              text-slate-700
              transition-colors
              hover:bg-slate-100
              dark:text-slate-200
              dark:hover:bg-slate-700
            `}
          >
            <span
              className={`
                flex
                items-center
                gap-3
              `}
            >
              <OptionIcon option={option} />
              <span
                className={`
                  flex
                  flex-col
                  items-start
                `}
              >
                <span>{themeLabels[option]}</span>
                <span
                  className={`
                    text-xs
                    font-normal
                    text-slate-500
                    dark:text-slate-400
                  `}
                >
                  {themeDescriptions[option]}
                </span>
              </span>
            </span>
            {isActive ? (
              <CheckIcon
                className={`
                  h-4
                  w-4
                  shrink-0
                  text-primary-600
                  dark:text-primary-400
                `}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );

  const triggerLabel = `Theme: ${themeLabels[theme]}`;
  const triggerTitle = open ? `Close theme menu` : `Change theme (${themeLabels[theme]})`;

  return (
    <div className={`relative`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={persisting}
        aria-label={triggerLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={triggerTitle}
        data-testid="consumer-mobile-theme-switcher"
        className={`
          flex
          min-h-11
          min-w-11
          items-center
          justify-center
          gap-1.5
          rounded-lg
          px-2.5
          text-slate-600
          transition-all
          duration-200
          hover:bg-slate-100
          hover:text-slate-900
          focus:outline-hidden
          focus:ring-2
          focus:ring-primary-500/50
          focus:ring-offset-2
          focus:ring-offset-white
          disabled:opacity-60
          dark:text-slate-300
          dark:hover:bg-slate-800
          dark:hover:text-white
          dark:focus:ring-offset-slate-900
        `}
      >
        <ThemeTriggerIcon theme={theme} />
        <ChevronDownIcon
          className={`
            h-4
            w-4
            transition-transform
            duration-200
            ${open ? `rotate-180` : ``}
          `}
          strokeWidth={2}
        />
      </button>
      {dropdownContent ? createPortal(dropdownContent, document.body) : null}
    </div>
  );
}
