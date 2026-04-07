'use client';

import { useCallback, useId, useState } from 'react';

import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { primeUserThemeCache } from './ThemeInitializer';
import { Theme, useTheme, type ITheme } from './ThemeProvider';
import styles from './ThemeSwitcher.module.css';
import { getLocalToastMessage, localToastKeys } from '../../lib/error-messages';
import { clientLogger } from '../../lib/logger';
import { showErrorToast } from '../../lib/toast.client';

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

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [persisting, setPersisting] = useState(false);
  const selectId = useId();

  const persistTheme = useCallback(
    async (newTheme: ITheme) => {
      if (newTheme === theme) {
        return;
      }

      const previousTheme = theme;
      setTheme(newTheme);
      primeUserThemeCache(newTheme);
      setPersisting(true);
      try {
        const response = await fetch(`/api/settings/theme`, {
          method: `PUT`,
          headers: { 'content-type': `application/json` },
          credentials: `include`,
          body: JSON.stringify({ theme: newTheme.toUpperCase() }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update theme`);
        }
      } catch (error) {
        setTheme(previousTheme);
        primeUserThemeCache(previousTheme);
        showErrorToast(getLocalToastMessage(localToastKeys.THEME_UPDATE_FAILED));
        clientLogger.error(`Theme switcher update error`, {
          reason: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setPersisting(false);
      }
    },
    [setTheme, theme],
  );

  const triggerLabel = `Theme: ${themeLabels[theme]}`;
  const triggerTitle = `Change theme (${themeLabels[theme]})`;

  return (
    <div className={styles.container}>
      <label htmlFor={selectId} className={styles.srOnly}>
        Theme
      </label>
      <div className={styles.selectWrap}>
        <ThemeTriggerIcon theme={theme} />
        <select
          id={selectId}
          className={styles.select}
          value={theme}
          onChange={(event) => void persistTheme(event.target.value as ITheme)}
          disabled={persisting}
          aria-label={triggerLabel}
          title={triggerTitle}
          data-testid="consumer-mobile-theme-switcher"
        >
          {([Theme.LIGHT, Theme.DARK, Theme.SYSTEM] as const).map((option) => (
            <option key={option} value={option}>
              {themeLabels[option]}
            </option>
          ))}
        </select>
        <ChevronDownIcon className={styles.chevron} strokeWidth={2} />
      </div>
      <span className={styles.description} aria-hidden="true">
        {themeDescriptions[theme]}
      </span>
    </div>
  );
}
