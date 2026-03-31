'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { clientLogger } from '../lib/logger';

export const Theme = { LIGHT: `light`, DARK: `dark`, SYSTEM: `system` } as const;
export type ITheme = (typeof Theme)[keyof typeof Theme];

interface ThemeContextType {
  theme: ITheme;
  resolvedTheme: ITheme;
  setTheme: (theme: ITheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // During SSR/static generation, return a default theme
    return {
      theme: Theme.SYSTEM,
      resolvedTheme: Theme.LIGHT,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ITheme;
  storageKey?: string;
}

function isTheme(value: string | null): value is ITheme {
  return value === Theme.LIGHT || value === Theme.DARK || value === Theme.SYSTEM;
}

function resolveTheme(theme: ITheme, mediaQuery: MediaQueryList | null = null): typeof Theme.LIGHT | typeof Theme.DARK {
  if (theme === Theme.SYSTEM) {
    const prefersDark = mediaQuery?.matches ?? window.matchMedia(`(prefers-color-scheme: dark)`).matches;
    return prefersDark ? Theme.DARK : Theme.LIGHT;
  }

  return theme;
}

function applyResolvedTheme(nextTheme: typeof Theme.LIGHT | typeof Theme.DARK) {
  const root = window.document.documentElement;
  const body = window.document.body;

  root.classList.remove(Theme.LIGHT, Theme.DARK);
  root.classList.add(nextTheme);
  root.dataset.theme = nextTheme;

  body.classList.remove(Theme.LIGHT, Theme.DARK);
  body.classList.add(nextTheme);
  body.dataset.theme = nextTheme;
}

export function ThemeProvider({
  children,
  defaultTheme = Theme.SYSTEM,
  storageKey = `remoola-theme`,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ITheme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ITheme>(Theme.LIGHT);
  const [hasLoadedStoredTheme, setHasLoadedStoredTheme] = useState(false);

  // localStorage is only a bootstrap cache; authenticated server settings can
  // still overwrite the preference after the app shell loads.
  // Load theme from localStorage on mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (isTheme(stored)) {
        setThemeState(stored);
      }
    } catch (error) {
      clientLogger.warn(`Failed to load theme from localStorage`, {
        reason: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setHasLoadedStoredTheme(true);
    }
  }, [storageKey]);

  // Resolve theme based on user preference and system preference
  useEffect(() => {
    if (!hasLoadedStoredTheme) return;

    const nextTheme = resolveTheme(theme);

    setResolvedTheme(nextTheme);
    applyResolvedTheme(nextTheme);

    // Save to localStorage
    try {
      localStorage.setItem(storageKey, theme);
    } catch (error) {
      clientLogger.warn(`Failed to save theme to localStorage`, {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }, [hasLoadedStoredTheme, theme, storageKey]);

  // Listen for system theme changes when theme is 'SYSTEM'
  useEffect(() => {
    if (!hasLoadedStoredTheme || theme !== Theme.SYSTEM) return;

    const mediaQuery = window.matchMedia(`(prefers-color-scheme: dark)`);

    const handleChange = () => {
      const nextTheme = resolveTheme(Theme.SYSTEM, mediaQuery);

      setResolvedTheme(nextTheme);
      applyResolvedTheme(nextTheme);
    };

    mediaQuery.addEventListener(`change`, handleChange);
    return () => mediaQuery.removeEventListener(`change`, handleChange);
  }, [hasLoadedStoredTheme, theme]);

  const setTheme = useCallback((nextTheme: ITheme) => {
    setThemeState((currentTheme) => (currentTheme === nextTheme ? currentTheme : nextTheme));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT);
  }, [resolvedTheme, setTheme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [resolvedTheme, setTheme, theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
