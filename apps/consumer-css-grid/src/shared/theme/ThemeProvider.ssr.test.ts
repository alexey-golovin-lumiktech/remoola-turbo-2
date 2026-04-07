import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToString } from 'react-dom/server';

import { THEME } from '@remoola/api-types';

jest.mock(`@remoola/ui`, () => ({
  applyThemeToDocument: jest.fn(),
  persistThemePreference: jest.fn(),
  resolveThemePreference: (theme: `light` | `dark` | `system`, prefersDark: boolean) => {
    if (theme === `system`) {
      return prefersDark ? `dark` : `light`;
    }
    return theme;
  },
  setThemeColorMeta: jest.fn(),
}));

describe(`ThemeProvider (consumer-css-grid SSR)`, () => {
  it(`does not read browser theme sources during server render`, async () => {
    const globals = globalThis as typeof globalThis & {
      window?: {
        localStorage?: { getItem: () => string };
        matchMedia?: () => { matches: boolean };
      };
      document?: {
        cookie?: string;
        documentElement?: { dataset?: Record<string, string> };
      };
    };
    const originalWindow = globals.window;
    const originalDocument = globals.document;

    globals.window = {
      localStorage: { getItem: () => THEME.DARK },
      matchMedia: () => ({ matches: true }),
    };
    globals.document = {
      cookie: `remoola-theme=dark`,
      documentElement: { dataset: { themePreference: `dark` } },
    };

    try {
      const { ThemeProvider, useTheme } = await import(`./ThemeProvider`);

      function ThemeProbe() {
        const { theme, resolvedTheme } = useTheme();
        return React.createElement(`div`, null, `${theme}:${resolvedTheme}`);
      }

      const html = renderToString(
        React.createElement(ThemeProvider, { initialTheme: THEME.SYSTEM }, React.createElement(ThemeProbe)),
      );

      expect(html).toContain(`${THEME.SYSTEM}:light`);
    } finally {
      if (originalWindow === undefined) {
        delete globals.window;
      } else {
        globals.window = originalWindow;
      }

      if (originalDocument === undefined) {
        delete globals.document;
      } else {
        globals.document = originalDocument;
      }
    }
  });
});
