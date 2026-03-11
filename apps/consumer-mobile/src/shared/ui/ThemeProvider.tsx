'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { clientLogger } from '../../lib/logger';

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
    return {
      theme: Theme.SYSTEM,
      resolvedTheme: Theme.LIGHT,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}

const STORAGE_KEY = `remoola-theme`;

/**
 * Theme is read from localStorage on mount and applied immediately. When authenticated,
 * ThemeInitializer then fetches the server theme and overwrites context (and we persist
 * that to localStorage), so server wins for the next load.
 */
function applyThemeToDocument(nextTheme: `light` | `dark`) {
  const root = window.document.documentElement;
  const body = window.document.body;
  root.classList.remove(`light`, `dark`);
  body.classList.remove(`light`, `dark`);
  root.classList.add(nextTheme);
  body.classList.add(nextTheme);
  root.dataset.theme = nextTheme;
  body.dataset.theme = nextTheme;
}

export function ThemeProvider({
  children,
  defaultTheme = Theme.SYSTEM,
}: {
  children: ReactNode;
  defaultTheme?: ITheme;
}) {
  const [theme, setTheme] = useState<ITheme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ITheme>(Theme.LIGHT);
  const [storageRead, setStorageRead] = useState(false);

  // Read from localStorage first so we never apply theme from default (SYSTEM) before
  // we know the user's stored preference — avoids a brief dark flash when OS is dark.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ITheme | null;
      if (stored && [Theme.LIGHT, Theme.DARK, Theme.SYSTEM].includes(stored as ITheme)) {
        setTheme(stored as ITheme);
      }
      setStorageRead(true);
    } catch (error) {
      clientLogger.warn(`Failed to load theme from localStorage`, {
        reason: error instanceof Error ? error.message : String(error),
      });
      setStorageRead(true);
    }
  }, []);

  // Apply theme only after we've read from localStorage so we don't flash OS theme first.
  useEffect(() => {
    if (!storageRead) return;

    const resolveSystem = () => (window.matchMedia(`(prefers-color-scheme: dark)`).matches ? Theme.DARK : Theme.LIGHT);

    const nextTheme = theme === Theme.SYSTEM ? resolveSystem() : theme;
    setResolvedTheme(nextTheme);
    applyThemeToDocument(nextTheme);

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      clientLogger.warn(`Failed to save theme to localStorage`, {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }, [theme, storageRead]);

  useEffect(() => {
    if (theme !== Theme.SYSTEM) return;

    const mediaQuery = window.matchMedia(`(prefers-color-scheme: dark)`);
    const handleChange = () => {
      const nextTheme = mediaQuery.matches ? Theme.DARK : Theme.LIGHT;
      setResolvedTheme(nextTheme);
      applyThemeToDocument(nextTheme);
    };

    mediaQuery.addEventListener(`change`, handleChange);
    return () => mediaQuery.removeEventListener(`change`, handleChange);
  }, [theme]);

  const value: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme: () => setTheme(resolvedTheme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
