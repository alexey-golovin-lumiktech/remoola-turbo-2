import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import { primeUserThemeCache, resetUserThemeCache } from './ThemeInitializer';

describe(`ThemeInitializer cache hygiene (consumer-mobile)`, () => {
  beforeEach(() => {
    (globalThis as { window?: unknown }).window = {} as Window & typeof globalThis;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it(`primes the in-memory user theme cache`, () => {
    primeUserThemeCache(`dark`);

    expect(
      (window as Window & typeof globalThis & { __remoolaConsumerMobileCachedTheme?: string })
        .__remoolaConsumerMobileCachedTheme,
    ).toBe(`dark`);
  });

  it(`resets the in-memory theme cache and inflight request`, () => {
    (
      window as Window &
        typeof globalThis & {
          __remoolaConsumerMobileCachedTheme?: string | null;
          __remoolaConsumerMobileThemeRequest?: Promise<string | null> | null;
        }
    ).__remoolaConsumerMobileCachedTheme = `light`;
    (
      window as Window &
        typeof globalThis & {
          __remoolaConsumerMobileCachedTheme?: string | null;
          __remoolaConsumerMobileThemeRequest?: Promise<string | null> | null;
        }
    ).__remoolaConsumerMobileThemeRequest = Promise.resolve(`dark`);

    resetUserThemeCache();

    expect(
      (window as Window & typeof globalThis & { __remoolaConsumerMobileCachedTheme?: string | null })
        .__remoolaConsumerMobileCachedTheme,
    ).toBeNull();
    expect(
      (window as Window & typeof globalThis & { __remoolaConsumerMobileThemeRequest?: Promise<string | null> | null })
        .__remoolaConsumerMobileThemeRequest,
    ).toBeNull();
  });
});
