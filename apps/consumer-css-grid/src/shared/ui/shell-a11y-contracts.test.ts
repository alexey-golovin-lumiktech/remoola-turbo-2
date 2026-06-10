/**
 * Static a11y/responsive contract tests for the shell shell.
 *
 * These tests don't render — they read source files and assert structural
 * invariants the handoff pack flagged as easy to regress:
 *   - mobile bottom nav stays md:hidden and keeps a 6-column grid;
 *   - shell content keeps the mobile-bottom-nav padding compensation token;
 *   - mobile nav href list stays in sync with the rendered grid column count.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from '@jest/globals';

import { mobileNavHrefs } from './shellNavData';

const UI_ROOT = __dirname;
const SHELL_ROOT = join(__dirname, `..`, `..`, `app`, `(shell)`);

function readShared(relativePath: string): string {
  return readFileSync(join(UI_ROOT, relativePath), `utf8`);
}

function readShell(relativePath: string): string {
  return readFileSync(join(SHELL_ROOT, relativePath), `utf8`);
}

describe(`shell a11y / responsive contracts`, () => {
  it(`ShellNav imports the shared bottom-nav class token (single source of truth)`, () => {
    const src = readShared(`ShellNav.tsx`);
    expect(src).toContain(`SHELL_BOTTOM_NAV_CLASS`);
    expect(src).toMatch(/from\s+['"`]\.\/shell-layout-tokens['"`]/);
  });

  it(`ShellNav bottom-nav grid column count matches mobileNavHrefs length`, () => {
    const src = readShared(`ShellNav.tsx`);
    expect(mobileNavHrefs.length).toBe(6);
    expect(src).toContain(`grid-cols-6`);
  });

  it(`ShellClientWrapper applies the shared main-padding token`, () => {
    const src = readShell(`ShellClientWrapper.tsx`);
    expect(src).toContain(`SHELL_MAIN_PADDING_CLASS`);
    expect(src).toMatch(/from\s+['"`][^'"`]*shell-layout-tokens['"`]/);
  });

  it(`ShellClientWrapper applies the content-offset token (kept in sync with sidebar width)`, () => {
    const src = readShell(`ShellClientWrapper.tsx`);
    expect(src).toContain(`SHELL_CONTENT_OFFSET_CLASS`);
  });

  it(`ShellNav does not re-inline the sidebar width pixel value`, () => {
    const src = readShared(`ShellNav.tsx`);
    expect(src).not.toMatch(/md:w-\[248px\]/);
  });
});
