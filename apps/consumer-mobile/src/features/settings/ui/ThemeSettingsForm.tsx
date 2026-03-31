'use client';

import { useState, useEffect, useRef } from 'react';

import styles from './ThemeSettingsForm.module.css';
import { getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';
import { clientLogger } from '../../../lib/logger';
import { showErrorToast, showSuccessToast } from '../../../lib/toast.client';
import { FormCard } from '../../../shared/ui/FormCard';
import { CheckIcon } from '../../../shared/ui/icons/CheckIcon';
import { SpinnerIcon } from '../../../shared/ui/icons/SpinnerIcon';
import { Theme, useTheme, type ITheme } from '../../../shared/ui/ThemeProvider';

interface ThemeOption {
  value: ITheme;
  label: string;
  description: string;
  icon: string;
}

const themeOptions: ThemeOption[] = [
  { value: Theme.LIGHT, label: `Light`, description: `Always use light theme`, icon: `☀️` },
  { value: Theme.DARK, label: `Dark`, description: `Always use dark theme`, icon: `🌙` },
  { value: Theme.SYSTEM, label: `System`, description: `Follow your device preference`, icon: `💻` },
];

interface ThemeSettingsFormProps {
  initialTheme?: string | null;
}

export function ThemeSettingsForm({ initialTheme }: ThemeSettingsFormProps) {
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const hasSyncedInitialTheme = useRef(false);

  // Sync server theme into context only once on mount so we don't overwrite user's
  // selection when parent re-renders with stale settings before refetch.
  useEffect(() => {
    if (initialTheme === undefined || initialTheme === null) return;
    if (hasSyncedInitialTheme.current) return;
    const normalized = initialTheme.toLowerCase() as ITheme;
    if (![Theme.LIGHT, Theme.DARK, Theme.SYSTEM].includes(normalized)) return;
    hasSyncedInitialTheme.current = true;
    setTheme(normalized);
  }, [initialTheme, setTheme]);

  async function updateTheme(newTheme: ITheme) {
    if (newTheme === theme) return;
    const previousTheme = theme;
    setTheme(newTheme);
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

      showSuccessToast(`Theme updated`);
    } catch (error) {
      setTheme(previousTheme);
      showErrorToast(getLocalToastMessage(localToastKeys.THEME_UPDATE_FAILED));
      clientLogger.error(`Theme update error`, {
        reason: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormCard
      title="Theme"
      description="Choose how Remoola looks to you. Select a theme or follow your system preference."
    >
      <fieldset disabled={loading} className={styles.fieldset} data-testid="theme-settings-form">
        <legend className={styles.srOnly}>Theme preference</legend>
        {themeOptions.map((option) => {
          const isActive = theme === option.value;
          return (
            <label
              key={option.value}
              className={`${styles.option} ${isActive ? styles.optionActive : styles.optionInactive} ${loading ? styles.optionLoading : styles.optionInteractive}`}
            >
              <input
                type="radio"
                name="theme"
                value={option.value}
                checked={isActive}
                onChange={(e) => updateTheme(e.target.value as ITheme)}
                className={styles.srOnly}
                disabled={loading}
              />
              <span className={styles.optionIcon} aria-hidden="true">
                {option.icon}
              </span>
              <div className={styles.optionContent}>
                <div className={styles.optionTitle}>{option.label}</div>
                <div className={styles.optionDescription}>{option.description}</div>
              </div>
              {isActive ? (
                <div className={styles.checkWrap} aria-hidden="true">
                  <CheckIcon className={styles.checkIcon} />
                </div>
              ) : null}
            </label>
          );
        })}
      </fieldset>

      {loading ? (
        <div className={styles.loadingBanner} role="status">
          <SpinnerIcon className={styles.spinnerIcon} />
          <p className={styles.loadingText}>Saving...</p>
        </div>
      ) : null}
    </FormCard>
  );
}
