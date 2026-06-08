import { describe, expect, it } from '@jest/globals';

import { SHELL_STATUS_TONE_CLASS, getShellStatusTone, type ShellStatusTone } from './shell-status';

describe(`getShellStatusTone`, () => {
  const cases: ReadonlyArray<readonly [string, ShellStatusTone]> = [
    [`Signed`, `success`],
    [`Completed`, `success`],
    [`Connected`, `success`],
    [`Default`, `success`],
    [`Ready`, `success`],
    [`Pending`, `warning`],
    [`Processing`, `warning`],
    [`Review`, `warning`],
    [`Failed`, `neutral`],
    [`Rejected`, `neutral`],
    [`Draft`, `neutral`],
    [``, `neutral`],
    [`unknown`, `neutral`],
  ];

  it.each(cases)(`maps %p to tone %p`, (status, tone) => {
    expect(getShellStatusTone(status)).toBe(tone);
  });

  it(`is case-sensitive (matches current StatusPill behavior)`, () => {
    expect(getShellStatusTone(`signed`)).toBe(`neutral`);
    expect(getShellStatusTone(`PENDING`)).toBe(`neutral`);
  });
});

describe(`SHELL_STATUS_TONE_CLASS`, () => {
  it(`preserves the StatusPill success classes`, () => {
    expect(SHELL_STATUS_TONE_CLASS.success).toBe(
      `border-transparent bg-(--app-success-soft) text-(--app-success-text)`,
    );
  });

  it(`preserves the StatusPill warning classes`, () => {
    expect(SHELL_STATUS_TONE_CLASS.warning).toBe(
      `border-transparent bg-(--app-warning-soft) text-(--app-warning-text)`,
    );
  });

  it(`preserves the StatusPill neutral classes`, () => {
    expect(SHELL_STATUS_TONE_CLASS.neutral).toBe(
      `border-(--app-border) bg-(--app-surface-muted) text-(--app-text-soft)`,
    );
  });
});
