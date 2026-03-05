'use client';

import { useEffect } from 'react';

import { Theme, useTheme } from './ThemeProvider';
import { clientLogger } from '../../lib/logger';

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
            setTheme(data.theme.toLowerCase() as typeof Theme.LIGHT);
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
