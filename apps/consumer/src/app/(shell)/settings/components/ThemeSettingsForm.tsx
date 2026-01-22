'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { useTheme, type Theme } from '../../../../components/ThemeProvider';

interface ThemeOption {
  value: Theme;
  label: string;
  description: string;
  icon: string;
}

const themeOptions: ThemeOption[] = [
  {
    value: `light`,
    label: `Light`,
    description: `Always use light theme`,
    icon: `☀️`,
  },
  {
    value: `dark`,
    label: `Dark`,
    description: `Always use dark theme`,
    icon: `🌙`,
  },
  {
    value: `system`,
    label: `System`,
    description: `Follow your system preference`,
    icon: `💻`,
  },
];

export function ThemeSettingsForm() {
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);

  // Load user settings on mount
  useEffect(() => {
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
          }
        }
      } catch (error) {
        console.warn(`Failed to load theme settings:`, error);
      }
    }

    loadSettings();
  }, [setTheme]);

  async function updateTheme(newTheme: Theme) {
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
      toast.error(`Failed to update theme`);
      console.error(`Theme update error:`, error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border p-6 rounded-xl bg-white shadow-sm dark:bg-slate-800 dark:border-slate-600">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Theme Settings</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
        Choose how Remoola looks to you. Select a theme or follow your system preference.
      </p>

      <div className="space-y-3">
        {themeOptions.map((option) => (
          <label
            key={option.value}
            className={`flex items-center p-4 rounded-lg border cursor-pointer transition-colors ${
              theme === option.value
                ? `border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400`
                : `border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-slate-600
                dark:bg-slate-700 dark:hover:bg-slate-600`
            } ${loading ? `opacity-50 pointer-events-none` : ``}`}
          >
            <input
              type="radio"
              name="theme"
              value={option.value}
              checked={theme === option.value}
              onChange={(e) => updateTheme(e.target.value as Theme)}
              className="sr-only"
              disabled={loading}
            />
            <div className="flex items-center flex-1">
              <span className="text-2xl mr-4">{option.icon}</span>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{option.label}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">{option.description}</div>
              </div>
            </div>
            {theme === option.value && (
              <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            )}
          </label>
        ))}
      </div>

      {loading && <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">Updating theme...</div>}
    </div>
  );
}
