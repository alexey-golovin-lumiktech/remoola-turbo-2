import { type TTheme } from '@remoola/api-types';
import {
  buildThemeBootstrapScript,
  buildThemeCookieValue as buildSharedThemeCookieValue,
  parseThemePreference as parseStoredThemePreference,
  readThemeCookie as readSharedThemeCookie,
  resolveThemePreference as resolveSharedThemePreference,
  THEME_COOKIE_KEY,
  THEME_COOKIE_MAX_AGE_SECONDS,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from '@remoola/ui';

const CSS_GRID_THEME_COLORS = {
  light: `#f3f7fc`,
  dark: `#07142b`,
} as const;

function toStoredThemePreference(theme: TTheme): ThemePreference {
  return theme.toLowerCase() as ThemePreference;
}

function toApiTheme(theme: ThemePreference | null): TTheme | null {
  if (!theme) {
    return null;
  }

  return theme.toUpperCase() as TTheme;
}

export { THEME_STORAGE_KEY, type ResolvedTheme };

export function parseThemePreference(value: string | null | undefined): TTheme | null {
  return toApiTheme(parseStoredThemePreference(value));
}

export function resolveThemePreference(theme: TTheme, prefersDark: boolean): ResolvedTheme {
  return resolveSharedThemePreference(toStoredThemePreference(theme), prefersDark);
}

export function buildThemeCookieValue(theme: TTheme): string {
  return buildSharedThemeCookieValue(toStoredThemePreference(theme), {
    cookieKey: THEME_COOKIE_KEY,
    cookieMaxAgeSeconds: THEME_COOKIE_MAX_AGE_SECONDS,
  });
}

export function readThemeCookie(cookieHeader: string | null | undefined): TTheme | null {
  return toApiTheme(readSharedThemeCookie(cookieHeader, { cookieKey: THEME_COOKIE_KEY }));
}

export function buildThemeScript(initialTheme: TTheme): string {
  return buildThemeBootstrapScript({
    defaultTheme: toStoredThemePreference(initialTheme),
    storageKey: THEME_STORAGE_KEY,
    cookieKey: THEME_COOKIE_KEY,
    cookieMaxAgeSeconds: THEME_COOKIE_MAX_AGE_SECONDS,
    includeBody: false,
    includeThemeColor: true,
    themeColors: CSS_GRID_THEME_COLORS,
  });
}

export function getCssGridThemeColors() {
  return CSS_GRID_THEME_COLORS;
}
