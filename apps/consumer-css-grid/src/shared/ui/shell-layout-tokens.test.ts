import { describe, expect, it } from '@jest/globals';

import {
  SHELL_BOTTOM_NAV_CLASS,
  SHELL_CONTENT_OFFSET_CLASS,
  SHELL_LOADING_CARD_CLASS,
  SHELL_MAIN_PADDING_CLASS,
  SHELL_SIDEBAR_BASE_CLASS,
  SHELL_SIDEBAR_WIDTH_CLASS,
  shellMainAsideBalanced,
  shellMainAsideLeftSlight,
  shellMainAsidePrimary,
  shellMainAsideWideMain,
} from './shell-layout-tokens';

describe(`shell layout tokens`, () => {
  it(`pins sidebar width to md:w-[248px]`, () => {
    expect(SHELL_SIDEBAR_WIDTH_CLASS).toBe(`md:w-[248px]`);
  });

  it(`pins content offset to md:ml-[248px]`, () => {
    expect(SHELL_CONTENT_OFFSET_CLASS).toBe(`md:ml-[248px]`);
  });

  it(`keeps sidebar width and content offset numerically aligned`, () => {
    const widthPx = SHELL_SIDEBAR_WIDTH_CLASS.match(/md:w-\[(\d+)px\]/)?.[1];
    const offsetPx = SHELL_CONTENT_OFFSET_CLASS.match(/md:ml-\[(\d+)px\]/)?.[1];
    expect(widthPx).toBeDefined();
    expect(offsetPx).toBeDefined();
    expect(widthPx).toBe(offsetPx);
  });

  it(`includes the sidebar width token inside the composed sidebar base class`, () => {
    expect(SHELL_SIDEBAR_BASE_CLASS).toContain(SHELL_SIDEBAR_WIDTH_CLASS);
  });

  it(`compensates for the mobile bottom nav via pb-24`, () => {
    expect(SHELL_MAIN_PADDING_CLASS).toContain(`pb-24`);
  });

  it(`keeps the bottom nav fixed and mobile-only`, () => {
    expect(SHELL_BOTTOM_NAV_CLASS).toContain(`fixed`);
    expect(SHELL_BOTTOM_NAV_CLASS).toContain(`md:hidden`);
  });

  it(`pins the loading card class string`, () => {
    expect(SHELL_LOADING_CARD_CLASS).toContain(`rounded-[28px]`);
    expect(SHELL_LOADING_CARD_CLASS).toContain(`bg-(--app-surface)`);
    expect(SHELL_LOADING_CARD_CLASS).toContain(`shadow-(--app-shadow)`);
  });
});

describe(`shellMainAsideBalanced`, () => {
  it(`pins the exact class string`, () => {
    expect(shellMainAsideBalanced).toBe(`grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]`);
  });

  it(`ends narrow-side with 0.9fr (not 0.75fr)`, () => {
    expect(shellMainAsideBalanced).toContain(`0.9fr]`);
    expect(shellMainAsideBalanced).not.toContain(`0.75fr]`);
  });

  it(`contains grid-cols-1 gap-5`, () => {
    expect(shellMainAsideBalanced).toContain(`grid-cols-1 gap-5`);
  });
});

describe(`shellMainAsidePrimary`, () => {
  it(`pins the exact class string`, () => {
    expect(shellMainAsidePrimary).toBe(`grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]`);
  });

  it(`ends narrow-side with 0.75fr (not 0.9fr)`, () => {
    expect(shellMainAsidePrimary).toContain(`0.75fr]`);
    expect(shellMainAsidePrimary).not.toContain(`0.9fr]`);
  });

  it(`contains grid-cols-1 gap-5`, () => {
    expect(shellMainAsidePrimary).toContain(`grid-cols-1 gap-5`);
  });
});

describe(`shellMainAsideWideMain`, () => {
  it(`pins the exact class string`, () => {
    expect(shellMainAsideWideMain).toBe(`grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]`);
  });

  it(`uses 1.5fr_1fr ratio (dashboard main panels)`, () => {
    expect(shellMainAsideWideMain).toContain(`xl:grid-cols-[1.5fr_1fr]`);
  });
});

describe(`shellMainAsideLeftSlight`, () => {
  it(`pins the exact class string`, () => {
    expect(shellMainAsideLeftSlight).toBe(`grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_1fr]`);
  });

  it(`uses 1.35fr_1fr ratio (help hub)`, () => {
    expect(shellMainAsideLeftSlight).toContain(`xl:grid-cols-[1.35fr_1fr]`);
  });
});

describe(`mainAside ratio family`, () => {
  it(`every variant stacks to a single column below xl`, () => {
    for (const variant of [
      shellMainAsideBalanced,
      shellMainAsidePrimary,
      shellMainAsideWideMain,
      shellMainAsideLeftSlight,
    ]) {
      expect(variant).toContain(`grid-cols-1`);
      expect(variant).toContain(`gap-5`);
      expect(variant).toMatch(/xl:grid-cols-\[/);
    }
  });
});
