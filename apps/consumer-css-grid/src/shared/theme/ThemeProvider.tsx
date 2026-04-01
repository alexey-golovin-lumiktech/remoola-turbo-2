'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { THEME, type TTheme } from '@remoola/api-types';

import {
  buildThemeCookieValue,
  parseThemePreference,
  readThemeCookie,
  resolveThemePreference,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
} from '../../lib/theme';

type ThemeContextValue = {
  theme: TTheme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: TTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemPreference(): ResolvedTheme {
  if (typeof window === `undefined`) return `light`;
  return window.matchMedia(`(prefers-color-scheme: dark)`).matches ? `dark` : `light`;
}

function applyThemePreference(theme: TTheme) {
  const resolvedTheme = resolveThemePreference(theme, getSystemPreference() === `dark`);
  const root = document.documentElement;
  root.classList.remove(`light`, `dark`);
  root.classList.add(resolvedTheme);
  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = theme.toLowerCase();

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }

  document.cookie = buildThemeCookieValue(theme);

  return resolvedTheme;
}

function getInitialTheme(initialTheme: TTheme): TTheme {
  if (typeof window === `undefined`) return initialTheme;

  const documentTheme = parseThemePreference(document.documentElement.dataset.themePreference);
  if (documentTheme) return documentTheme;

  const cookieTheme = readThemeCookie(document.cookie);
  if (cookieTheme) return cookieTheme;

  try {
    const stored = parseThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }

  return initialTheme;
}

export function ThemeProvider({ children, initialTheme }: { children: ReactNode; initialTheme: TTheme }) {
  const [theme, setThemeState] = useState<TTheme>(() => getInitialTheme(initialTheme));
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveThemePreference(getInitialTheme(initialTheme), false),
  );

  useEffect(() => {
    setResolvedTheme(applyThemePreference(theme));

    if (theme !== THEME.SYSTEM) {
      return undefined;
    }

    const mediaQuery = window.matchMedia(`(prefers-color-scheme: dark)`);
    const handleChange = () => {
      setResolvedTheme(applyThemePreference(THEME.SYSTEM));
    };

    mediaQuery.addEventListener(`change`, handleChange);
    return () => mediaQuery.removeEventListener(`change`, handleChange);
  }, [theme]);

  const setTheme = useCallback((nextTheme: TTheme) => {
    setThemeState(nextTheme);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [resolvedTheme, setTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error(`useTheme must be used within ThemeProvider`);
  }
  return context;
}
