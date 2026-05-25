import {
  matchesContractPresenceFilter,
  matchesContractStatusFilter,
  normalizeContractPresenceFilter,
  normalizeContractSort,
  normalizeContractStatusFilter,
} from './consumer-contract-normalizers';

describe(`consumer contract normalizers`, () => {
  it(`normalizes status filters and rejects unknown values`, () => {
    expect(normalizeContractStatusFilter(` DRAFT `)).toBe(`draft`);
    expect(normalizeContractStatusFilter(`no_activity`)).toBe(`no_activity`);
    expect(normalizeContractStatusFilter(`cancelled`)).toBeNull();
    expect(normalizeContractStatusFilter(undefined)).toBeNull();
  });

  it(`normalizes presence filters and sort options with defaults`, () => {
    expect(normalizeContractPresenceFilter(` YES `)).toBe(`yes`);
    expect(normalizeContractPresenceFilter(`maybe`)).toBeNull();
    expect(normalizeContractSort(` payments_count `)).toBe(`payments_count`);
    expect(normalizeContractSort(`unsupported`)).toBe(`recent_activity`);
  });

  it(`matches status and presence filters`, () => {
    expect(matchesContractStatusFilter(`draft`, `draft`)).toBe(true);
    expect(matchesContractStatusFilter(null, `no_activity`)).toBe(true);
    expect(matchesContractStatusFilter(`completed`, `no_activity`)).toBe(false);
    expect(matchesContractPresenceFilter(true, `yes`)).toBe(true);
    expect(matchesContractPresenceFilter(true, `no`)).toBe(false);
    expect(matchesContractPresenceFilter(false, null)).toBe(true);
  });
});
