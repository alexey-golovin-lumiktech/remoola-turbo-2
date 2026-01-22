'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = `light` | `dark` | `system`;

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: `light` | `dark`;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // During SSR/static generation, return a default theme
    return {
      theme: `system` as Theme,
      resolvedTheme: `light` as `light` | `dark`,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({ children, defaultTheme = `system`, storageKey = `remoola-theme` }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<`light` | `dark`>(`light`);
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey) as Theme;
      if (stored && [`light`, `dark`, `system`].includes(stored)) {
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

    if (theme === `system`) {
      const systemTheme = window.matchMedia(`(prefers-color-scheme: dark)`).matches ? `dark` : `light`;

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

  // Listen for system theme changes when theme is 'system'
  useEffect(() => {
    if (theme !== `system`) return;

    const mediaQuery = window.matchMedia(`(prefers-color-scheme: dark)`);

    const handleChange = () => {
      const root = window.document.documentElement;
      const systemTheme = mediaQuery.matches ? `dark` : `light`;

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
    toggleTheme: () => setTheme((prev) => (prev === `light` ? `dark` : `light`)),
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
