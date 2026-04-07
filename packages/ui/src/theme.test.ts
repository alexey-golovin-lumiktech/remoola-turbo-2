import assert from 'node:assert/strict';
import test from 'node:test';
import { getSystemResolvedTheme, readPersistedThemePreference } from './theme';


function createDocument({
  themePreference,
  cookie = ``,
}: {
  themePreference?: string;
  cookie?: string;
}): Document {
  return {
    cookie,
    documentElement: {
      dataset: themePreference ? { themePreference } : {},
    },
  } as unknown as Document;
}

test(`prefers bootstrap theme preference from the document dataset`, () => {
  const storage = {
    getItem: () => `light`,
    setItem: () => { },
  };

  assert.equal(
    readPersistedThemePreference({
      document: createDocument({ themePreference: `system`, cookie: `remoola-theme=dark` }),
      storage,
    }),
    `system`,
  );
});

test(`falls back to the theme cookie when no dataset preference exists`, () => {
  const storage = {
    getItem: () => `light`,
    setItem: () => { },
  };

  assert.equal(
    readPersistedThemePreference({
      document: createDocument({ cookie: `remoola-theme=dark` }),
      storage,
    }),
    `dark`,
  );
});

test(`falls back to storage when dataset and cookie are missing`, () => {
  const storage = {
    getItem: () => `light`,
    setItem: () => { },
  };

  assert.equal(
    readPersistedThemePreference({
      document: createDocument({}),
      storage,
    }),
    `light`,
  );
});

test(`returns the fallback theme when storage is unavailable`, () => {
  const storage = {
    getItem: () => {
      throw new Error(`Storage unavailable`);
    },
    setItem: () => { },
  };

  assert.equal(
    readPersistedThemePreference({
      document: createDocument({}),
      storage,
      fallbackTheme: `system`,
    }),
    `system`,
  );
});

test(`returns light when matchMedia is unavailable`, () => {
  assert.equal(getSystemResolvedTheme({} as unknown as Window), `light`);
});

test(`reads dark mode from matchMedia when available`, () => {
  assert.equal(
    getSystemResolvedTheme({
      matchMedia: () =>
        ({
          matches: true,
        }) as MediaQueryList,
    } as unknown as Window),
    `dark`,
  );
});
