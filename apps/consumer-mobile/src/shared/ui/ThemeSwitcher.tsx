'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@remoola/ui';

import { CheckIcon } from './icons/CheckIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { Theme, useTheme, type ITheme } from './ThemeProvider';
import styles from './ThemeSwitcher.module.css';

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
  if (option === Theme.LIGHT) return <SunIcon size={18} className={styles.iconSun} />;
  if (option === Theme.DARK) return <MoonIcon size={18} className={styles.iconMoon} />;
  return <SystemIcon size={18} className={styles.iconSystem} />;
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

  const dropdownContent =
    open && dropdownPosition && typeof document !== `undefined` ? (
      <div
        ref={dropdownRef}
        role="listbox"
        aria-label="Theme options"
        className={styles.dropdown}
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
              className={styles.option}
            >
              <span className={styles.optionLeft}>
                <OptionIcon option={option} />
                <span className={styles.optionLabels}>
                  <span>{themeLabels[option]}</span>
                  <span className={styles.optionDescription}>{themeDescriptions[option]}</span>
                </span>
              </span>
              {isActive ? <CheckIcon className={styles.checkIcon} /> : null}
            </button>
          );
        })}
      </div>
    ) : null;

  const triggerLabel = `Theme: ${themeLabels[theme]}`;
  const triggerTitle = open ? `Close theme menu` : `Change theme (${themeLabels[theme]})`;

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={persisting}
        aria-label={triggerLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={triggerTitle}
        data-testid="consumer-mobile-theme-switcher"
        className={styles.trigger}
      >
        <ThemeTriggerIcon theme={theme} />
        <ChevronDownIcon className={cn(styles.chevron, open && styles.chevronOpen)} strokeWidth={2} />
      </button>
      {dropdownContent ? createPortal(dropdownContent, document.body) : null}
    </div>
  );
}
