'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { clientLogger } from '../../../lib/logger';
import { FormCard } from '../../../shared/ui/FormCard';
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
      <fieldset disabled={loading} className="space-y-2" data-testid="theme-settings-form">
        <legend className="sr-only">Theme preference</legend>
        {themeOptions.map((option) => {
          const isActive = theme === option.value;
          return (
            <label
              key={option.value}
              className={
                `flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ` +
                (isActive
                  ? `border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/30`
                  : `border-slate-200 bg-white hover:border-slate-300 dark:border-slate-600 dark:bg-slate-700/50 dark:hover:border-slate-500`) +
                (loading ? ` cursor-not-allowed opacity-60` : ``)
              }
            >
              <input
                type="radio"
                name="theme"
                value={option.value}
                checked={isActive}
                onChange={(e) => updateTheme(e.target.value as ITheme)}
                className="sr-only"
                disabled={loading}
              />
              <span className="text-xl" aria-hidden="true">
                {option.icon}
              </span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{option.label}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">{option.description}</div>
              </div>
              {isActive && (
                <div
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 dark:bg-primary-500"
                  aria-hidden="true"
                >
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>
              )}
            </label>
          );
        })}
      </fieldset>

      {loading && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400" role="status">
          Updating theme…
        </p>
      )}
    </FormCard>
  );
}
