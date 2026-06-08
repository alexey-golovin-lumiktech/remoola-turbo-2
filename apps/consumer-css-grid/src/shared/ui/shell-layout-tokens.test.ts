import { describe, expect, it } from '@jest/globals';

import {
  SHELL_BOTTOM_NAV_CLASS,
  SHELL_CONTENT_OFFSET_CLASS,
  SHELL_MAIN_PADDING_CLASS,
  SHELL_SIDEBAR_BASE_CLASS,
  SHELL_SIDEBAR_WIDTH_CLASS,
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
});
