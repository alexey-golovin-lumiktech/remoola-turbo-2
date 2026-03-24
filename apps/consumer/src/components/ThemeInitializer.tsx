'use client';

import { useEffect } from 'react';

import { Theme, type ITheme, useTheme } from './ThemeProvider';
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

function normalizeTheme(value: unknown): ITheme {
  if (typeof value !== `string`) {
    return Theme.SYSTEM;
  }

  const nextTheme = value.toLowerCase();
  return nextTheme === Theme.LIGHT || nextTheme === Theme.DARK || nextTheme === Theme.SYSTEM ? nextTheme : Theme.SYSTEM;
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

    let cancelled = false;

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
          if (!cancelled) {
            setTheme(normalizeTheme(data.theme));
          }
        }
      } catch {
        // Fall back to system preference; do not log or surface
      }
    };

    loadUserTheme();
    return () => {
      cancelled = true;
    };
  }, [setTheme]);

  return null;
}
