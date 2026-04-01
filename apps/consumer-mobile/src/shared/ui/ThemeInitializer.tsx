'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { Theme, useTheme, type ITheme } from './ThemeProvider';
import { clientLogger } from '../../lib/logger';
import { handleSessionExpired } from '../../lib/session-expired';

type ThemeCacheWindow = Window &
  typeof globalThis & {
    __remoolaConsumerMobileCachedTheme?: ITheme | null;
    __remoolaConsumerMobileThemeRequest?: Promise<ITheme | null> | null;
  };

/**
 * Loads theme from the settings API when authenticated. Server is the source of truth;
 * on successful GET we set theme in context and ThemeProvider persists it to localStorage
 * so the next load is consistent.
 */
function isAuthOrPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith(`/login`) ||
    pathname.startsWith(`/signup`) ||
    pathname.startsWith(`/auth/`) ||
    pathname.startsWith(`/forgot-password`)
  );
}

function getThemeCacheHost(): ThemeCacheWindow {
  return window as ThemeCacheWindow;
}

export function primeUserThemeCache(theme: ITheme | null) {
  if (typeof window === `undefined`) return;
  const host = getThemeCacheHost();
  host.__remoolaConsumerMobileCachedTheme = theme;
}

export function resetUserThemeCache() {
  if (typeof window === `undefined`) return;
  const host = getThemeCacheHost();
  host.__remoolaConsumerMobileCachedTheme = null;
  host.__remoolaConsumerMobileThemeRequest = null;
}

async function loadUserThemeOnce(): Promise<ITheme | null> {
  const host = getThemeCacheHost();

  if (host.__remoolaConsumerMobileCachedTheme) {
    return host.__remoolaConsumerMobileCachedTheme;
  }

  if (host.__remoolaConsumerMobileThemeRequest) {
    return host.__remoolaConsumerMobileThemeRequest;
  }

  host.__remoolaConsumerMobileThemeRequest = (async () => {
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
        if (response.status >= 500) {
          clientLogger.warn(`Failed to load user theme: server error ${response.status}`);
        }
        return null;
      }

      const data = (await response.json()) as { theme?: string };
      if (!data.theme) {
        host.__remoolaConsumerMobileCachedTheme = Theme.SYSTEM;
        return host.__remoolaConsumerMobileCachedTheme;
      }

      const normalized = data.theme.toLowerCase();
      if ([Theme.LIGHT, Theme.DARK, Theme.SYSTEM].includes(normalized as ITheme)) {
        host.__remoolaConsumerMobileCachedTheme = normalized as ITheme;
        return host.__remoolaConsumerMobileCachedTheme;
      }

      return null;
    } catch (error) {
      clientLogger.warn(`Failed to load user theme`, {
        reason: error instanceof Error ? error.message : String(error),
      });
      return null;
    } finally {
      host.__remoolaConsumerMobileThemeRequest = null;
    }
  })();

  return host.__remoolaConsumerMobileThemeRequest;
}

export function ThemeInitializer() {
  const { setTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === `undefined`) return;
    if (isAuthOrPublicPath(pathname ?? window.location.pathname ?? ``)) return;

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
  }, [pathname, setTheme]);

  return null;
}
