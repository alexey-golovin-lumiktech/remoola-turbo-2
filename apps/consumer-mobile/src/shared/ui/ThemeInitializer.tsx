'use client';

import { useEffect } from 'react';

import { Theme, useTheme, type ITheme } from './ThemeProvider';
import { clientLogger } from '../../lib/logger';

/**
 * Loads theme from the settings API when authenticated. Server is the source of truth;
 * on successful GET we set theme in context and ThemeProvider persists it to localStorage
 * so the next load is consistent.
 */
export function ThemeInitializer() {
  const { setTheme } = useTheme();

  useEffect(() => {
    if (typeof window === `undefined`) return;

    const loadUserTheme = async () => {
      try {
        const response = await fetch(`/api/settings/theme`, {
          method: `GET`,
          headers: { 'content-type': `application/json` },
          credentials: `include`,
        });

        if (response.status === 401) return;

        if (response.ok) {
          const data = (await response.json()) as { theme?: string };
          if (data.theme) {
            const normalized = data.theme.toLowerCase();
            if ([Theme.LIGHT, Theme.DARK, Theme.SYSTEM].includes(normalized as ITheme)) {
              setTheme(normalized as ITheme);
            }
          } else {
            setTheme(Theme.SYSTEM);
          }
        } else if (response.status >= 500) {
          clientLogger.warn(`Failed to load user theme: server error ${response.status}`);
        }
      } catch (error) {
        clientLogger.warn(`Failed to load user theme`, {
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    };

    loadUserTheme();
  }, [setTheme]);

  return null;
}
