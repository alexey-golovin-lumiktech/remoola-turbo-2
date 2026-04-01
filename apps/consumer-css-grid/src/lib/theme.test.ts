import { describe, expect, it } from '@jest/globals';

import { THEME } from '@remoola/api-types';

import { buildThemeScript, parseThemePreference, readThemeCookie, resolveThemePreference } from './theme';

describe(`theme helpers`, () => {
  it(`accepts uppercase and legacy lowercase persisted values`, () => {
    expect(parseThemePreference(`LIGHT`)).toBe(THEME.LIGHT);
    expect(parseThemePreference(`dark`)).toBe(THEME.DARK);
    expect(parseThemePreference(`system`)).toBe(THEME.SYSTEM);
  });

  it(`rejects unsupported persisted values`, () => {
    expect(parseThemePreference(`auto`)).toBeNull();
    expect(parseThemePreference(``)).toBeNull();
    expect(parseThemePreference(null)).toBeNull();
  });

  it(`resolves system mode from the caller-provided media preference`, () => {
    expect(resolveThemePreference(THEME.SYSTEM, true)).toBe(`dark`);
    expect(resolveThemePreference(THEME.SYSTEM, false)).toBe(`light`);
    expect(resolveThemePreference(THEME.DARK, false)).toBe(`dark`);
    expect(resolveThemePreference(THEME.LIGHT, true)).toBe(`light`);
  });

  it(`reads the persisted theme cookie`, () => {
    expect(readThemeCookie(`foo=bar; remoola-theme=LIGHT`)).toBe(THEME.LIGHT);
    expect(readThemeCookie(`remoola-theme=dark`)).toBe(THEME.DARK);
    expect(readThemeCookie(`foo=bar`)).toBeNull();
  });

  it(`embeds the initial theme in the no-flash bootstrap script`, () => {
    const script = buildThemeScript(THEME.DARK);

    expect(script).toContain(`var DEFAULT_THEME = 'DARK';`);
    expect(script).toContain(`var cookieTheme = parseTheme(readCookie(COOKIE_KEY));`);
    expect(script).toContain(`document.cookie = COOKIE_KEY + '=' + storedTheme`);
    expect(script).toContain(`window.localStorage.setItem(STORAGE_KEY, theme);`);
    expect(script).toContain(`root.dataset.themePreference = theme.toLowerCase();`);
  });
});
