'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { cn } from '@remoola/ui';

import { primeUserThemeCache } from '../../../../components/ThemeInitializer';
import { Theme, useTheme, type ITheme } from '../../../../components/ThemeProvider';
import styles from '../../../../components/ui/classNames.module.css';
import { clientLogger } from '../../../../lib/logger';

const {
  themeCard,
  themeDescription,
  themeOptionActive,
  themeOptionBase,
  themeOptionBody,
  themeOptionCheck,
  themeOptionCheckInner,
  themeOptionIcon,
  themeOptionInactive,
  themeOptionInput,
  themeOptionLabel,
  themeOptionText,
  themeOptions,
  themeTitle,
} = styles;

interface ThemeConfigOptions {
  value: ITheme;
  label: string;
  description: string;
  icon: string;
}

const themeConfigOptions: ThemeConfigOptions[] = [
  {
    value: Theme.LIGHT,
    label: `Light`,
    description: `Always use light theme`,
    icon: `☀️`,
  },
  {
    value: Theme.DARK,
    label: `Dark`,
    description: `Always use dark theme`,
    icon: `🌙`,
  },
  {
    value: Theme.SYSTEM,
    label: `System`,
    description: `Follow your system preference`,
    icon: `💻`,
  },
];

interface ThemeSettingsFormProps {
  /** When provided, synced into context once without triggering a duplicate theme fetch. */
  initialTheme?: string | null;
}

export function ThemeSettingsForm({ initialTheme }: ThemeSettingsFormProps = {}) {
  const { theme, setTheme } = useTheme();
  const hasSyncedInitialTheme = useRef(false);
  const latestRequestId = useRef(0);

  // Sync server theme into context only once so later parent re-renders do not
  // overwrite the user's in-session choice with stale settings.
  useEffect(() => {
    if (initialTheme === undefined || initialTheme === null) return;
    if (hasSyncedInitialTheme.current) return;

    const normalized = initialTheme.toLowerCase();
    if (normalized !== Theme.LIGHT && normalized !== Theme.DARK && normalized !== Theme.SYSTEM) return;

    hasSyncedInitialTheme.current = true;
    setTheme(normalized);
    primeUserThemeCache(normalized);
  }, [initialTheme, setTheme]);

  async function updateTheme(newTheme: ITheme) {
    if (newTheme === theme) return;

    const previousTheme = theme;
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    setTheme(newTheme);
    primeUserThemeCache(newTheme);
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

      toast.success(`Theme updated successfully`);
    } catch (error) {
      if (latestRequestId.current === requestId) {
        setTheme(previousTheme);
        primeUserThemeCache(previousTheme);
      }
      toast.error(`We couldn't update your theme. Please try again.`);
      clientLogger.error(`Theme update error`, {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <div className={themeCard}>
      <h3 className={themeTitle}>Theme Settings</h3>
      <p className={themeDescription}>
        Choose how Remoola looks to you. Select a theme or follow your system preference.
      </p>

      <div className={themeOptions}>
        {themeConfigOptions.map((option) => (
          <label
            key={option.value}
            className={cn(themeOptionBase, theme === option.value ? themeOptionActive : themeOptionInactive)}
          >
            <input
              type="radio"
              name="theme"
              value={option.value}
              checked={theme === option.value}
              onChange={(e) => updateTheme(e.target.value as ITheme)}
              className={themeOptionInput}
            />
            <div className={themeOptionBody}>
              <span className={themeOptionIcon}>{option.icon}</span>
              <div>
                <div className={themeOptionLabel}>{option.label}</div>
                <div className={themeOptionText}>{option.description}</div>
              </div>
            </div>
            {theme === option.value && (
              <div className={themeOptionCheck}>
                <div className={themeOptionCheckInner} />
              </div>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
