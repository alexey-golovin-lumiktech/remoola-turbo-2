import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import { primeUserThemeCache, resetUserThemeCache } from './ThemeInitializer';

describe(`ThemeInitializer cache hygiene (consumer)`, () => {
  beforeEach(() => {
    (globalThis as { window?: unknown }).window = {} as Window & typeof globalThis;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it(`primes the in-memory user theme cache`, () => {
    primeUserThemeCache(`dark`);

    expect(
      (window as Window & typeof globalThis & { __remoolaConsumerCachedTheme?: string }).__remoolaConsumerCachedTheme,
    ).toBe(`dark`);
  });

  it(`resets the in-memory theme cache and inflight request`, () => {
    (
      window as Window &
        typeof globalThis & {
          __remoolaConsumerCachedTheme?: string | null;
          __remoolaConsumerThemeRequest?: Promise<string | null> | null;
        }
    ).__remoolaConsumerCachedTheme = `light`;
    (
      window as Window &
        typeof globalThis & {
          __remoolaConsumerCachedTheme?: string | null;
          __remoolaConsumerThemeRequest?: Promise<string | null> | null;
        }
    ).__remoolaConsumerThemeRequest = Promise.resolve(`dark`);

    resetUserThemeCache();

    expect(
      (window as Window & typeof globalThis & { __remoolaConsumerCachedTheme?: string | null })
        .__remoolaConsumerCachedTheme,
    ).toBeNull();
    expect(
      (window as Window & typeof globalThis & { __remoolaConsumerThemeRequest?: Promise<string | null> | null })
        .__remoolaConsumerThemeRequest,
    ).toBeNull();
  });
});
