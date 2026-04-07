'use client';

import { useEffect } from 'react';

import { Theme, type ITheme, useTheme } from './ThemeProvider';
import { handleSessionExpired } from '../lib/session-expired';

type ThemeCacheWindow = Window &
  typeof globalThis & {
    __remoolaConsumerCachedTheme?: ITheme | null;
    __remoolaConsumerThemeRequest?: Promise<ITheme | null> | null;
  };

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

function getThemeCacheHost(): ThemeCacheWindow {
  return window as ThemeCacheWindow;
}

export function primeUserThemeCache(theme: ITheme | null) {
  if (typeof window === `undefined`) return;
  const host = getThemeCacheHost();
  host.__remoolaConsumerCachedTheme = theme;
}

export function resetUserThemeCache() {
  if (typeof window === `undefined`) return;
  const host = getThemeCacheHost();
  host.__remoolaConsumerCachedTheme = null;
  host.__remoolaConsumerThemeRequest = null;
}

async function loadUserThemeOnce(): Promise<ITheme | null> {
  const host = getThemeCacheHost();

  if (host.__remoolaConsumerCachedTheme) {
    return host.__remoolaConsumerCachedTheme;
  }

  if (host.__remoolaConsumerThemeRequest) {
    return host.__remoolaConsumerThemeRequest;
  }

  host.__remoolaConsumerThemeRequest = (async () => {
    try {
      const response = await fetch(`/api/settings/theme`, {
        method: `GET`,
        headers: { 'content-type': `application/json` },
        credentials: `include`,
      });

      if (response.status === 401) {
        handleSessionExpired();
        return null;
      }

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const theme = normalizeTheme(data.theme);
      host.__remoolaConsumerCachedTheme = theme;
      return theme;
    } catch {
      return null;
    } finally {
      host.__remoolaConsumerThemeRequest = null;
    }
  })();

  return host.__remoolaConsumerThemeRequest;
}

export function ThemeInitializer() {
  const { setTheme } = useTheme();

  useEffect(() => {
    if (typeof window === `undefined`) return;

    const pathname = window.location.pathname ?? ``;
    if (isAuthOrPublicPath(pathname)) {
      return;
    }

    let cancelled = false;

    const loadUserTheme = async () => {
      const theme = await loadUserThemeOnce();
      if (!cancelled && theme) {
        setTheme(theme);
      }
    };

    loadUserTheme();
    return () => {
      cancelled = true;
    };
  }, [setTheme]);

  return null;
}
