import { describe, expect, it } from '@jest/globals';

import { fieldCardClass, fieldInputClass, fieldLabelClass } from './shell-form-tokens';

describe(`shell form tokens`, () => {
  it(`pins fieldLabelClass exactly`, () => {
    expect(fieldLabelClass).toBe(`mb-2 block text-sm text-(--app-text-muted)`);
  });

  it(`pins fieldInputClass exactly`, () => {
    expect(fieldInputClass).toBe(
      `w-full rounded-2xl border border-(--app-border) bg-(--app-surface-strong) px-4 py-3 text-(--app-text) shadow-(--app-shadow) outline-none placeholder:text-(--app-text-faint) focus:border-(--app-primary) focus:ring-4 focus:ring-(--app-focus)`,
    );
  });

  it(`fieldInputClass targets surface-strong background (not muted)`, () => {
    expect(fieldInputClass).toContain(`bg-(--app-surface-strong)`);
    expect(fieldInputClass).not.toContain(`bg-(--app-surface-muted)`);
  });

  it(`fieldInputClass carries focus ring classes`, () => {
    expect(fieldInputClass).toContain(`focus:ring-4`);
    expect(fieldInputClass).toContain(`focus:ring-(--app-focus)`);
  });

  it(`pins fieldCardClass exactly`, () => {
    expect(fieldCardClass).toBe(
      `rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm text-(--app-text-soft)`,
    );
  });

  it(`fieldCardClass targets surface-muted background (not strong)`, () => {
    expect(fieldCardClass).toContain(`bg-(--app-surface-muted)`);
    expect(fieldCardClass).not.toContain(`bg-(--app-surface-strong)`);
  });
});
