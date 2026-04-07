/**
 * @jest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const applyThemeToDocument = jest.fn();
const persistThemePreference = jest.fn();
const readThemePreferenceFromStorage = jest.fn(() => null);
const setThemeColorMeta = jest.fn();

jest.mock(`@remoola/ui`, () => ({
  applyThemeToDocument,
  getSystemResolvedTheme: () => `light`,
  parseThemePreference: (value: unknown) => {
    if (typeof value !== `string`) {
      return null;
    }
    const normalized = value.trim().toLowerCase();
    return normalized === `light` || normalized === `dark` || normalized === `system` ? normalized : null;
  },
  persistThemePreference,
  readPersistedThemePreference: ({ fallbackTheme }: { fallbackTheme?: `light` | `dark` | `system` }) =>
    document.documentElement.dataset.themePreference ?? fallbackTheme ?? null,
  readThemePreferenceFromStorage,
  resolveThemePreference: (theme: `light` | `dark` | `system`, prefersDark: boolean) => {
    if (theme === `system`) {
      return prefersDark ? `dark` : `light`;
    }
    return theme;
  },
  setThemeColorMeta,
}));

jest.mock(`../lib/logger`, () => ({
  clientLogger: { warn: jest.fn() },
}));

describe(`ThemeProvider (admin)`, () => {
  const originalMatchMedia = window.matchMedia;
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    applyThemeToDocument.mockClear();
    persistThemePreference.mockClear();
    readThemePreferenceFromStorage.mockClear();
    setThemeColorMeta.mockClear();

    document.documentElement.dataset.themePreference = `dark`;
    container = document.createElement(`div`);
    document.body.appendChild(container);
    root = createRoot(container);

    Object.defineProperty(window, `matchMedia`, {
      configurable: true,
      writable: true,
      value: jest.fn().mockReturnValue({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }),
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    delete document.documentElement.dataset.themePreference;
    delete (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
    Object.defineProperty(window, `matchMedia`, {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
  });

  it(`applies and persists the bootstrap theme before any default system fallback can run`, async () => {
    const { ThemeProvider, useTheme } = await import(`./ThemeProvider`);
    const renderSnapshots: Array<{ theme: string; resolvedTheme: string }> = [];

    function ThemeProbe() {
      const { theme, resolvedTheme } = useTheme();
      renderSnapshots.push({ theme, resolvedTheme });
      return React.createElement(`div`, null, `${theme}:${resolvedTheme}`);
    }

    await act(async () => {
      root.render(React.createElement(ThemeProvider, null, React.createElement(ThemeProbe)));
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(renderSnapshots).toContainEqual({ theme: `dark`, resolvedTheme: `dark` });
    expect(renderSnapshots.at(-1)).toEqual({ theme: `dark`, resolvedTheme: `dark` });
    expect(readThemePreferenceFromStorage).not.toHaveBeenCalled();
    expect(persistThemePreference).toHaveBeenCalledTimes(1);
    expect(persistThemePreference).toHaveBeenNthCalledWith(1, `dark`, {
      storageKey: `remoola-theme`,
      cookieKey: `remoola-theme`,
    });
    expect(applyThemeToDocument).toHaveBeenCalledTimes(1);
    expect(applyThemeToDocument).toHaveBeenNthCalledWith(1, `dark`, { includeBody: true, preference: `dark` });
    expect(setThemeColorMeta).toHaveBeenCalledTimes(1);
    expect(setThemeColorMeta).toHaveBeenNthCalledWith(1, `dark`);
    expect(persistThemePreference.mock.calls).not.toContainEqual([`system`, expect.anything()]);
    expect(applyThemeToDocument.mock.calls).not.toContainEqual([
      `light`,
      expect.objectContaining({ preference: `system` }),
    ]);
  });
});
