import { describe, expect, it } from '@jest/globals';

import { dangerButtonClass, primaryButtonClass, secondaryButtonClass } from './shell-button-tokens';

describe(`shell button tokens`, () => {
  it(`pins primaryButtonClass exactly`, () => {
    expect(primaryButtonClass).toBe(
      `w-full rounded-2xl bg-(--app-primary) px-4 py-3 font-medium text-(--app-primary-contrast) disabled:cursor-not-allowed disabled:opacity-50`,
    );
  });

  it(`primaryButtonClass uses primary-contrast text (not app-text)`, () => {
    expect(primaryButtonClass).toContain(`text-(--app-primary-contrast)`);
    expect(primaryButtonClass).not.toContain(`text-(--app-text)`);
  });

  it(`pins secondaryButtonClass exactly`, () => {
    expect(secondaryButtonClass).toBe(
      `flex w-full items-center justify-center rounded-2xl border border-(--app-border) bg-(--app-surface) px-4 py-3 text-sm font-medium text-(--app-text) shadow-(--app-shadow) transition hover:bg-(--app-surface-strong)`,
    );
  });

  it(`pins dangerButtonClass exactly`, () => {
    expect(dangerButtonClass).toBe(
      `flex w-full items-center justify-center rounded-2xl border border-transparent bg-(--app-danger-soft) px-4 py-3 text-sm font-medium text-(--app-danger-text) transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60`,
    );
  });

  it(`dangerButtonClass uses danger-soft background`, () => {
    expect(dangerButtonClass).toContain(`bg-(--app-danger-soft)`);
  });
});
