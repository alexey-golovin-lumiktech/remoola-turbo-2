import { describe, expect, it } from '@jest/globals';

import {
  DEFAULT_LOOKBACK_DAYS,
  formatBytes,
  formatDateTime,
  getDefaultLookbackDateOnlyRange,
  getDefaultLookbackIsoRange,
} from './admin-format';

describe(`admin format helpers`, () => {
  it(`formats empty and present datetimes consistently`, () => {
    expect(formatDateTime(null)).toBe(`-`);
    expect(formatDateTime(undefined, `—`)).toBe(`—`);
    expect(formatDateTime(`2026-04-20T12:34:56.000Z`)).toContain(`2026`);
  });

  it(`formats bytes into human readable units`, () => {
    expect(formatBytes(null)).toBe(`-`);
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
