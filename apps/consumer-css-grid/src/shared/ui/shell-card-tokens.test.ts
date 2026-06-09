import { describe, expect, it } from '@jest/globals';

import { shellBadgePrimary, shellCardSm, shellContainerBase, shellEmptyState } from './shell-card-tokens';

describe(`shellEmptyState`, () => {
  it(`pins the exact class string`, () => {
    expect(shellEmptyState).toBe(
      `rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-10 text-center text-sm text-(--app-text-muted)`,
    );
  });

  it(`contains py-10 text-center (distinguishes from other containers)`, () => {
    expect(shellEmptyState).toContain(`py-10`);
    expect(shellEmptyState).toContain(`text-center`);
  });
});

describe(`shellCardSm`, () => {
  it(`pins the exact class string`, () => {
    expect(shellCardSm).toBe(`rounded-[24px] border border-(--app-border) bg-(--app-surface-muted) p-4`);
  });

  it(`uses rounded-[24px] not rounded-2xl`, () => {
    expect(shellCardSm).toContain(`rounded-[24px]`);
    expect(shellCardSm).not.toContain(`rounded-2xl`);
  });
});

describe(`shellContainerBase`, () => {
  it(`pins the exact class string`, () => {
    expect(shellContainerBase).toBe(`rounded-2xl border border-(--app-border) bg-(--app-surface-muted) p-4`);
  });

  it(`uses rounded-2xl not rounded-[24px]`, () => {
    expect(shellContainerBase).toContain(`rounded-2xl`);
    expect(shellContainerBase).not.toContain(`rounded-[24px]`);
  });
});

describe(`shellBadgePrimary`, () => {
  it(`pins the exact class string`, () => {
    expect(shellBadgePrimary).toBe(
      `rounded-full bg-(--app-primary-soft) px-3 py-1 text-xs font-medium text-(--app-primary)`,
    );
  });

  it(`contains bg-(--app-primary-soft) and rounded-full`, () => {
    expect(shellBadgePrimary).toContain(`bg-(--app-primary-soft)`);
    expect(shellBadgePrimary).toContain(`rounded-full`);
  });
});
