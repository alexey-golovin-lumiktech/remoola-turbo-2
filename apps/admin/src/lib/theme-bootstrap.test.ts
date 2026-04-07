import { describe, expect, it } from '@jest/globals';

import { buildThemeBootstrapScript } from '@remoola/ui';

describe(`theme bootstrap (admin)`, () => {
  it(`builds a no-flash script with canonical lowercase defaults and browser chrome sync`, () => {
    const script = buildThemeBootstrapScript({
      defaultTheme: `system`,
      includeBody: true,
      includeThemeColor: true,
    });

    expect(script).toContain(`var DEFAULT_THEME="system";`);
    expect(script).toContain(`var INCLUDE_BODY=true;`);
    expect(script).toContain(`var INCLUDE_THEME_COLOR=true;`);
    expect(script).toContain(`root.dataset.themePreference=theme;`);
    expect(script).toContain(`meta.name='theme-color';`);
    expect(script).toContain(`window.localStorage.setItem(STORAGE_KEY,theme);`);
  });
});
