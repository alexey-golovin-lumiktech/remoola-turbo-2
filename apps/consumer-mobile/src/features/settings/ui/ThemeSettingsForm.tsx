'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { clientLogger } from '../../../lib/logger';
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

  useEffect(() => {
    if (initialTheme !== undefined && initialTheme !== null) {
      const normalized = initialTheme.toLowerCase() as ITheme;
      if ([Theme.LIGHT, Theme.DARK, Theme.SYSTEM].includes(normalized)) {
        setTheme(normalized);
      }
    }
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
      toast.success(`Theme updated`);
    } catch (error) {
      toast.error(`We couldn't update your theme. Please try again.`);
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
      <fieldset disabled={loading} className={`space-y-3`} data-testid="theme-settings-form">
        <legend className={`sr-only`}>Theme preference</legend>
        {themeOptions.map((option) => {
          const isActive = theme === option.value;
          return (
            <label
              key={option.value}
              className={
                `group flex min-h-[60px] cursor-pointer items-center gap-4 rounded-xl border-2 px-4 py-3.5 transition-all duration-200 ` +
                (isActive
                  ? `border-primary-500 bg-gradient-to-r from-primary-50 to-primary-100/50 shadow-md shadow-primary-500/10 dark:border-primary-400 dark:from-primary-900/30 dark:to-primary-900/20 dark:shadow-primary-900/20`
                  : `border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800/50 dark:hover:border-slate-500`) +
                (loading ? ` cursor-not-allowed opacity-60` : ` hover:scale-[1.01] active:scale-[0.99]`)
              }
            >
              <input
                type="radio"
                name="theme"
                value={option.value}
                checked={isActive}
                onChange={(e) => updateTheme(e.target.value as ITheme)}
                className={`sr-only`}
                disabled={loading}
              />
              <span className={`text-2xl shrink-0`} aria-hidden="true">
                {option.icon}
              </span>
              <div className={`flex-1 min-w-0`}>
                <div
                  className={`
                  text-base
                  font-bold
                  text-slate-900
                  dark:text-white
                `}
                >
                  {option.label}
                </div>
                <div className={`text-sm text-slate-600 dark:text-slate-400`}>{option.description}</div>
              </div>
              {isActive && (
                <div
                  className={`
                    flex
                    h-6
                    w-6
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-primary-600
                    dark:bg-primary-500
                    shadow-lg
                    shadow-primary-500/50
                  `}
                  aria-hidden="true"
                >
                  <CheckIcon className={`h-3.5 w-3.5 text-white`} />
                </div>
              )}
            </label>
          );
        })}
      </fieldset>

      {loading && (
        <div
          className={`
            mt-4
            flex
            items-center
            gap-2
            rounded-lg
            bg-primary-50
            px-3
            py-2
            dark:bg-primary-900/20
          `}
          role="status"
        >
          <SpinnerIcon
            className={`
            h-4
            w-4
            text-primary-600
            dark:text-primary-400
          `}
          />
          <p
            className={`
            text-sm
            font-medium
            text-primary-700
            dark:text-primary-300
          `}
          >
            Updating theme…
          </p>
        </div>
      )}
    </FormCard>
  );
}
