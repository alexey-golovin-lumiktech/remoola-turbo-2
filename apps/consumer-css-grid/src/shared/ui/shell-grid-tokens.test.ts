import { describe, expect, it } from '@jest/globals';

import { shellGridContent2, shellGridDetail3, shellGridForm2, shellGridMetrics4 } from './shell-grid-tokens';

describe(`shell grid tokens`, () => {
  it(`pins shellGridForm2 exactly`, () => {
    expect(shellGridForm2).toBe(`grid grid-cols-1 gap-3 md:grid-cols-2`);
  });

  it(`shellGridForm2 uses gap-3 (tight form gap)`, () => {
    expect(shellGridForm2).toContain(`gap-3`);
    expect(shellGridForm2).not.toContain(`gap-4`);
  });

  it(`pins shellGridMetrics4 exactly`, () => {
    expect(shellGridMetrics4).toBe(`grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4`);
  });

  it(`shellGridMetrics4 expands to 4 columns on xl`, () => {
    expect(shellGridMetrics4).toContain(`xl:grid-cols-4`);
  });

  it(`pins shellGridDetail3 exactly`, () => {
    expect(shellGridDetail3).toBe(`grid grid-cols-1 gap-4 sm:grid-cols-3`);
  });

  it(`shellGridDetail3 uses sm breakpoint (not md)`, () => {
    expect(shellGridDetail3).toContain(`sm:grid-cols-3`);
    expect(shellGridDetail3).not.toContain(`md:`);
  });

  it(`pins shellGridContent2 exactly`, () => {
    expect(shellGridContent2).toBe(`grid grid-cols-1 gap-4 md:grid-cols-2`);
  });

  it(`shellGridContent2 uses gap-4 (not gap-3)`, () => {
    expect(shellGridContent2).toContain(`gap-4`);
    expect(shellGridContent2).not.toContain(`gap-3`);
  });
});
