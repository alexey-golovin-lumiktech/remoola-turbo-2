import { describe, expect, it } from '@jest/globals';

import { SHELL_STATUS_TONE_CLASS, getShellStatusTone, type ShellStatusTone } from './shell-status';

describe(`getShellStatusTone`, () => {
  const cases: ReadonlyArray<readonly [string, ShellStatusTone]> = [
    // Originally-mapped success statuses (preserved)
    [`Signed`, `success`],
    [`Completed`, `success`],
    [`Connected`, `success`],
    [`Default`, `success`],
    [`Ready`, `success`],
    // Domain success additions
    [`Approved`, `success`],
    [`Verified`, `success`],
    [`Executed`, `success`],
    [`Active`, `success`],
    [`Confirmed`, `success`],
    [`Paid`, `success`],
    [`Settled`, `success`],
    // Originally-mapped warning statuses (preserved)
    [`Pending`, `warning`],
    [`Processing`, `warning`],
    [`Review`, `warning`],
    // Domain warning additions
    [`Submitted`, `warning`],
    [`Initiated`, `warning`],
    [`Draft`, `warning`],
    [`Unverified`, `warning`],
    [`Verification in progress`, `warning`],
    [`Verification In Progress`, `warning`],
    [`In review`, `warning`],
    [`In Review`, `warning`],
    [`Awaiting payment`, `warning`],
    [`Awaiting Payment`, `warning`],
    // Danger tone (new) — domain statuses that previously fell through to neutral
    [`Failed`, `danger`],
    [`Rejected`, `danger`],
    [`Cancelled`, `danger`],
    [`Canceled`, `danger`],
    [`Terminated`, `danger`],
    [`Declined`, `danger`],
    [`Expired`, `danger`],
    [`Reverted`, `danger`],
    [`Verification failed`, `danger`],
    [`Verification Failed`, `danger`],
    [`Rejected by payee`, `danger`],
    [`Rejected By Payee`, `danger`],
    [`Rejected by payer`, `danger`],
    [`Rejected By Payer`, `danger`],
    // Neutral fallback
    [``, `neutral`],
    [`unknown`, `neutral`],
    [`No activity`, `neutral`],
  ];

  it.each(cases)(`maps %p to tone %p`, (status, tone) => {
    expect(getShellStatusTone(status)).toBe(tone);
  });

  it(`is case-sensitive (matches current StatusPill behavior)`, () => {
    expect(getShellStatusTone(`signed`)).toBe(`neutral`);
    expect(getShellStatusTone(`PENDING`)).toBe(`neutral`);
    expect(getShellStatusTone(`failed`)).toBe(`neutral`);
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

  it(`pins the new danger classes`, () => {
    expect(SHELL_STATUS_TONE_CLASS.danger).toBe(`border-transparent bg-(--app-danger-soft) text-(--app-danger-text)`);
  });

  it(`preserves the StatusPill neutral classes`, () => {
    expect(SHELL_STATUS_TONE_CLASS.neutral).toBe(
      `border-(--app-border) bg-(--app-surface-muted) text-(--app-text-soft)`,
    );
  });
});
