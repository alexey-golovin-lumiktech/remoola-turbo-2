import { describe, expect, it } from '@jest/globals';

import {
  DEFAULT_LOOKBACK_DAYS,
  formatBytes,
  formatDate,
  formatDateTime,
  EMPTY_VALUE,
  getDefaultLookbackDateOnlyRange,
  getDefaultLookbackIsoRange,
} from './admin-format';

describe(`admin format helpers`, () => {
  it(`formats empty and present datetime consistently`, () => {
    expect(formatDateTime(`not-a-date`)).toBe(EMPTY_VALUE);
    expect(formatDateTime(null)).toBe(EMPTY_VALUE);
    expect(formatDateTime(undefined)).toBe(EMPTY_VALUE);
    expect(formatDateTime(`2026-04-20T12:34:56.000Z`)).toContain(`2026`);
  });

  it(`formats datetime in UTC to avoid operator-local date drift`, () => {
    const formatted = formatDateTime(`2026-04-20T23:30:00.000Z`);
    expect(formatted).toBe(
      new Date(`2026-04-20T23:30:00.000Z`).toLocaleString(undefined, {
        dateStyle: `medium`,
        timeStyle: `short`,
        timeZone: `UTC`,
      }),
    );
  });

  it(`formats date-only values without time component`, () => {
    expect(formatDate(`not-a-date`)).toBe(EMPTY_VALUE);
    expect(formatDate(null)).toBe(EMPTY_VALUE);
    expect(formatDate(undefined)).toBe(EMPTY_VALUE);
    expect(formatDate(`2026-04-20T23:30:00.000Z`)).toBe(
      new Date(`2026-04-20T23:30:00.000Z`).toLocaleString(undefined, {
        dateStyle: `medium`,
        timeZone: `UTC`,
      }),
    );
  });

  it(`formats bytes into human readable units`, () => {
    expect(formatBytes(null)).toBe(EMPTY_VALUE);
    expect(formatBytes(512)).toBe(`512 B`);
    expect(formatBytes(1_536)).toBe(`1.5 KB`);
    expect(formatBytes(2 * 1024 * 1024)).toBe(`2.0 MB`);
  });

  it(`builds stable default lookback shapes`, () => {
    const dateOnlyRange = getDefaultLookbackDateOnlyRange();
    const isoRange = getDefaultLookbackIsoRange();

    expect(DEFAULT_LOOKBACK_DAYS).toBe(7);
    expect(dateOnlyRange.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dateOnlyRange.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(isoRange.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(isoRange.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
