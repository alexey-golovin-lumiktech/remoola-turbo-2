import { THEME, type TTheme } from '@remoola/api-types';

export const THEME_STORAGE_KEY = `remoola-theme`;
export const THEME_COOKIE_KEY = `remoola-theme`;
export const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type ResolvedTheme = `light` | `dark`;

function normalizeThemeToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.toUpperCase();
}

export function parseThemePreference(value: string | null | undefined): TTheme | null {
  const normalized = normalizeThemeToken(value);
  if (normalized === THEME.LIGHT || normalized === THEME.DARK || normalized === THEME.SYSTEM) {
    return normalized;
  }
  return null;
}

export function resolveThemePreference(theme: TTheme, prefersDark: boolean): ResolvedTheme {
  if (theme === THEME.SYSTEM) {
    return prefersDark ? `dark` : `light`;
  }
  return theme === THEME.DARK ? `dark` : `light`;
}

export function buildThemeCookieValue(theme: TTheme): string {
  return `${THEME_COOKIE_KEY}=${theme}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export function readThemeCookie(cookieHeader: string | null | undefined): TTheme | null {
  if (!cookieHeader) return null;

  const parts = cookieHeader.split(`;`);
  for (const part of parts) {
    const [rawKey, ...rawValue] = part.trim().split(`=`);
    if (rawKey !== THEME_COOKIE_KEY) continue;
    return parseThemePreference(rawValue.join(`=`));
  }

  return null;
}

export function buildThemeScript(initialTheme: TTheme): string {
  return `
(function() {
  var STORAGE_KEY = '${THEME_STORAGE_KEY}';
  var COOKIE_KEY = '${THEME_COOKIE_KEY}';
  var DEFAULT_THEME = '${initialTheme}';

  function parseTheme(value) {
    if (!value) return null;
    var normalized = String(value).trim().toUpperCase();
    return normalized === 'LIGHT' || normalized === 'DARK' || normalized === 'SYSTEM' ? normalized : null;
  }

  function readCookie(name) {
    var prefix = name + '=';
    var parts = document.cookie ? document.cookie.split(';') : [];
    for (var index = 0; index < parts.length; index += 1) {
      var item = parts[index].trim();
      if (item.indexOf(prefix) === 0) {
        return item.slice(prefix.length);
      }
    }
    return null;
  }

  function getPreferredTheme() {
    var cookieTheme = parseTheme(readCookie(COOKIE_KEY));
    if (cookieTheme) {
      return cookieTheme;
    }

    var stored = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {}

    var storedTheme = parseTheme(stored);
    if (storedTheme) {
      document.cookie = COOKIE_KEY + '=' + storedTheme + '; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax';
      return storedTheme;
    }

    return DEFAULT_THEME;
  }

  function resolveTheme(theme) {
    if (theme === 'SYSTEM') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme === 'DARK' ? 'dark' : 'light';
  }

  function apply(theme) {
    var resolved = resolveTheme(theme);
    var root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
    root.dataset.theme = resolved;
    root.dataset.themePreference = theme.toLowerCase();

    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {}

    document.cookie = COOKIE_KEY + '=' + theme + '; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax';
  }

  apply(getPreferredTheme());
})();
`.trim();
}
