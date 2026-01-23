'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

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

export function ThemeProvider({
  children,
  defaultTheme = Theme.SYSTEM,
  storageKey = `remoola-theme`,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<ITheme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ITheme>(Theme.LIGHT);
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey) as ITheme;
      if (stored && [Theme.LIGHT, Theme.DARK, Theme.SYSTEM].includes(stored)) {
        setTheme(stored);
      }
    } catch (error) {
      console.warn(`Failed to load theme from localStorage:`, error);
    }
    setMounted(true);
  }, [storageKey]);

  // Resolve theme based on user preference and system preference
  useEffect(() => {
    const root = window.document.documentElement;

    if (theme === Theme.SYSTEM) {
      const systemTheme = window.matchMedia(`(prefers-color-scheme: dark)`).matches ? Theme.DARK : Theme.LIGHT;

      setResolvedTheme(systemTheme);
      root.classList.remove(`light`, `dark`);
      root.classList.add(systemTheme);
    } else {
      setResolvedTheme(theme);
      root.classList.remove(`light`, `dark`);
      root.classList.add(theme);
    }

    // Save to localStorage
    try {
      localStorage.setItem(storageKey, theme);
    } catch (error) {
      console.warn(`Failed to save theme to localStorage:`, error);
    }
  }, [theme, storageKey]);

  // Listen for system theme changes when theme is 'SYSTEM'
  useEffect(() => {
    if (theme !== Theme.SYSTEM) return;

    const mediaQuery = window.matchMedia(`(prefers-color-scheme: dark)`);

    const handleChange = () => {
      const root = window.document.documentElement;
      const systemTheme = mediaQuery.matches ? Theme.DARK : Theme.LIGHT;

      setResolvedTheme(systemTheme);
      root.classList.remove(`light`, `dark`);
      root.classList.add(systemTheme);
    };

    mediaQuery.addEventListener(`change`, handleChange);
    return () => mediaQuery.removeEventListener(`change`, handleChange);
  }, [theme]);

  const value = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme: () => setTheme((prev) => (prev === Theme.LIGHT ? Theme.DARK : Theme.LIGHT)),
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
