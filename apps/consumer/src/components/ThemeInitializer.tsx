'use client';

import { useEffect } from 'react';

import { Theme, useTheme } from './ThemeProvider';
import { handleSessionExpired } from '../lib/session-expired';

/** Paths where we never fetch user theme (no session expected); avoids 401 and session-expired on auth/reset flows. */
function isAuthOrPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith(`/login`) ||
    pathname.startsWith(`/signup`) ||
    pathname.startsWith(`/auth/`) ||
    pathname.startsWith(`/forgot-password`)
  );
}

export function ThemeInitializer() {
  const { setTheme } = useTheme();

  useEffect(() => {
    if (typeof window === `undefined`) return;

    const pathname = window.location.pathname ?? ``;
    if (isAuthOrPublicPath(pathname)) {
      setTheme(Theme.SYSTEM);
      return;
    }

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
