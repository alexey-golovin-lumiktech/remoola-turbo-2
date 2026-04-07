'use client';

import { useCallback, useId, useState } from 'react';
import { toast } from 'sonner';

import { ChevronDownIcon } from '@remoola/ui';

import styles from './DesktopThemeSwitcher.module.css';
import { clientLogger } from '../../lib/logger';
import { primeUserThemeCache } from '../ThemeInitializer';
import { Theme, useTheme, type ITheme } from '../ThemeProvider';

const themeLabels: Record<ITheme, string> = {
  [Theme.LIGHT]: `Light`,
  [Theme.DARK]: `Dark`,
  [Theme.SYSTEM]: `System`,
};

const themeDescriptions: Record<ITheme, string> = {
  [Theme.LIGHT]: `Always use light theme`,
  [Theme.DARK]: `Always use dark theme`,
  [Theme.SYSTEM]: `Follow your system preference`,
};

const themeOptions = [Theme.LIGHT, Theme.DARK, Theme.SYSTEM] as const;

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path
        d={
          `M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41` +
          `M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41`
        }
      />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        d={
          `M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 ` +
          `0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 ` +
          `12.75 21a9.753 9.753 0 009.002-5.998z`
        }
      />
    </svg>
  );
}

function SystemIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function ThemeOptionIcon({ theme }: { theme: ITheme }) {
  if (theme === Theme.LIGHT) return <SunIcon className={styles.triggerIcon} />;
  if (theme === Theme.DARK) return <MoonIcon className={styles.triggerIcon} />;
  return <SystemIcon className={styles.triggerIcon} />;
}

export function DesktopThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [persisting, setPersisting] = useState(false);
  const selectId = useId();

  const persistTheme = useCallback(
    async (nextTheme: ITheme) => {
      if (nextTheme === theme) {
        return;
      }

      const previousTheme = theme;
      setTheme(nextTheme);
      primeUserThemeCache(nextTheme);
      setPersisting(true);

      try {
        const response = await fetch(`/api/settings/theme`, {
          method: `PUT`,
          headers: { 'content-type': `application/json` },
          credentials: `include`,
          body: JSON.stringify({ theme: nextTheme.toUpperCase() }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update theme`);
        }
      } catch (error) {
        setTheme(previousTheme);
        primeUserThemeCache(previousTheme);
        toast.error(`We couldn't update your theme. Please try again.`);
        clientLogger.error(`Desktop theme switcher update error`, {
          reason: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setPersisting(false);
      }
    },
    [setTheme, theme],
  );

  const triggerTitle = `Theme: ${themeLabels[theme]}`;

  return (
    <div className={styles.container}>
      <label htmlFor={selectId} className={styles.srOnly}>
        Theme
      </label>
      <div className={styles.selectWrap}>
        <ThemeOptionIcon theme={theme} />
        <select
          id={selectId}
          className={styles.select}
          aria-label={triggerTitle}
          title={triggerTitle}
          value={theme}
          onChange={(event) => void persistTheme(event.target.value as ITheme)}
          disabled={persisting}
          data-testid="consumer-desktop-theme-switcher"
        >
          {themeOptions.map((option) => (
            <option key={option} value={option}>
              {themeLabels[option]}
            </option>
          ))}
        </select>
        <ChevronDownIcon className={styles.chevron} size={16} aria-hidden="true" />
      </div>
      <span className={styles.description} aria-hidden="true">
        {themeDescriptions[theme]}
      </span>
    </div>
  );
}
