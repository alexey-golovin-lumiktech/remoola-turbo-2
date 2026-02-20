'use client';

import { useEffect } from 'react';

import { Theme, useTheme } from './ThemeProvider';
import { handleSessionExpired } from '../lib/session-expired';

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

        if (response.status === 401) {
          handleSessionExpired();
          return;
        }
        if (response.ok) {
          const data = await response.json();
          if (data.theme) {
            setTheme(data.theme.toLowerCase());
          } else {
            setTheme(Theme.SYSTEM);
          }
        }
      } catch {
        // Fall back to system preference; do not log or surface
      }
    };

    loadUserTheme();
  }, [setTheme]);

  return null;
}
