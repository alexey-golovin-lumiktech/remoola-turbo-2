'use client';

import { useEffect } from 'react';

import { useTheme } from './ThemeProvider';

export function ThemeInitializer() {
  const { setTheme } = useTheme();

  useEffect(() => {
    // Only run on client side
    if (typeof window === `undefined`) return;

    // Load user's theme preference from API
    const loadUserTheme = async () => {
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
        console.warn(`Failed to load user theme preference:`, error);
        // Fall back to localStorage or system preference
      }
    };

    loadUserTheme();
  }, [setTheme]);

  return null;
}
