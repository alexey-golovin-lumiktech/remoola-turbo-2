'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Theme, useTheme, type ITheme } from '../../../../components/ThemeProvider';
import styles from '../../../../components/ui/classNames.module.css';

const {
  themeCard,
  themeDescription,
  themeDeviceHint,
  themeOptionActive,
  themeOptionBase,
  themeOptionBody,
  themeOptionCheck,
  themeOptionCheckInner,
  themeOptionDisabled,
  themeOptionIcon,
  themeOptionInactive,
  themeOptionInput,
  themeOptionLabel,
  themeOptionText,
  themeOptions,
  themeTitle,
  themeUpdating,
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
  /** When provided, used as initial theme and theme is not fetched on mount (avoids duplicate GET). */
  initialTheme?: string | null;
}

export function ThemeSettingsForm({ initialTheme }: ThemeSettingsFormProps = {}) {
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);

  // Load user theme on mount when parent did not provide initial settings
  useEffect(() => {
    if (initialTheme !== undefined) {
      const normalized = initialTheme ? initialTheme.toLowerCase() : Theme.SYSTEM;
      setTheme(normalized as ITheme);
      return;
    }
    async function loadSettings() {
      try {
        const response = await fetch(`/api/settings/theme`, {
          method: `GET`,
          headers: { 'content-type': `application/json` },
          credentials: `include`,
        });

        if (response.ok) {
          const data = await response.json();
          if (data.theme) {
            setTheme(data.theme.toLowerCase());
          } else {
            setTheme(Theme.SYSTEM);
          }
        }
      } catch (error) {
        console.warn(`Failed to load theme settings:`, error);
      }
    }

    loadSettings();
  }, [initialTheme, setTheme]);

  async function updateTheme(newTheme: ITheme) {
    setLoading(true);
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

      setTheme(newTheme);
      toast.success(`Theme updated successfully`);
    } catch (error) {
      toast.error(`We couldn't update your theme. Please try again.`);
      console.error(`Theme update error:`, error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={themeCard}>
      <h3 className={themeTitle}>Theme Settings</h3>
      <p className={themeDescription}>
        Choose how Remoola looks to you. Select a theme or follow your system preference.
      </p>
      {theme === Theme.SYSTEM && <p className={themeDeviceHint}>Using device theme</p>}

      <div className={themeOptions}>
        {themeConfigOptions.map((option) => (
          <label
            key={option.value}
            className={`${themeOptionBase} ${
              theme === option.value ? themeOptionActive : themeOptionInactive
            } ${loading ? themeOptionDisabled : ``}`}
          >
            <input
              type="radio"
              name="theme"
              value={option.value}
              checked={theme === option.value}
              onChange={(e) => updateTheme(e.target.value as ITheme)}
              className={themeOptionInput}
              disabled={loading}
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

      {loading && <div className={themeUpdating}>Updating theme...</div>}
    </div>
  );
}
