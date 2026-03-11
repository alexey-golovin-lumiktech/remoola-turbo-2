'use client';

import { useEffect } from 'react';

import { Theme, useTheme } from './ThemeProvider';

const THEME_COLORS: Record<string, string> = {
  [Theme.LIGHT]: `#f8fafc`,
  [Theme.DARK]: `#0f172a`,
};

/**
 * Updates the document theme-color meta tag to match the resolved theme so browser
 * chrome (e.g. status bar) reflects the app theme rather than system preference.
 */
export function ThemeColorMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const color = THEME_COLORS[resolvedTheme] ?? THEME_COLORS[Theme.LIGHT];
    const metas = document.querySelectorAll<HTMLMetaElement>(`meta[name="theme-color"]`);
    if (metas.length > 0) {
      metas.forEach((meta) => {
        meta.content = color;
      });
    } else {
      const meta = document.createElement(`meta`);
      meta.name = `theme-color`;
      meta.content = color;
      document.head.appendChild(meta);
    }
  }, [resolvedTheme]);

  return null;
}
