import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToString } from 'react-dom/server';

jest.mock(`@remoola/ui`, () => ({
  applyThemeToDocument: jest.fn(),
  getSystemResolvedTheme: jest.fn(() => `light`),
  persistThemePreference: jest.fn(),
  readPersistedThemePreference: jest.fn(() => `system`),
  resolveThemePreference: (theme: `light` | `dark` | `system`, prefersDark: boolean) => {
    if (theme === `system`) {
      return prefersDark ? `dark` : `light`;
    }
    return theme;
  },
  setThemeColorMeta: jest.fn(),
}));

jest.mock(`../lib/logger`, () => ({
  clientLogger: { warn: jest.fn() },
}));

describe(`ThemeProvider (admin SSR)`, () => {
  it(`renders without browser globals`, async () => {
    const globals = globalThis as typeof globalThis & {
      window?: unknown;
      document?: unknown;
    };
    const originalWindow = globals.window;
    const originalDocument = globals.document;

    try {
      globals.window = undefined;
      globals.document = undefined;

      const { ThemeProvider } = await import(`./ThemeProvider`);
      const html = renderToString(React.createElement(ThemeProvider, null, React.createElement(`div`, null, `SSR`)));

      expect(html).toContain(`SSR`);
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
