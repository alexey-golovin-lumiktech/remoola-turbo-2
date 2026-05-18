import { $Enums } from '@remoola/database-2';

import {
  hasMissingProfileData,
  normalizeActiveStatuses,
  normalizePage,
  normalizeReason,
} from './admin-v2-verification-policy';

describe(`admin-v2 verification policy helpers`, () => {
  it(`normalizes queue pagination with max page size`, () => {
    expect(normalizePage(-1, 999)).toEqual({ page: 1, pageSize: 100, skip: 0 });
    expect(normalizePage(3, 10)).toEqual({ page: 3, pageSize: 10, skip: 20 });
  });

  it(`normalizes unsupported active status filters to all active statuses`, () => {
    expect(normalizeActiveStatuses(`APPROVED`)).toEqual([
      $Enums.VerificationStatus.PENDING,
      $Enums.VerificationStatus.MORE_INFO,
      $Enums.VerificationStatus.FLAGGED,
    ]);
    expect(normalizeActiveStatuses(`FLAGGED`)).toEqual([$Enums.VerificationStatus.FLAGGED]);
  });

  it(`truncates decision reasons to the configured maximum`, () => {
    expect(normalizeReason(`  reason  `)).toBe(`reason`);
    expect(normalizeReason(`x`.repeat(501))).toHaveLength(500);
    expect(normalizeReason(`   `)).toBeNull();
  });

  it(`detects missing business and personal profile data`, () => {
    expect(
      hasMissingProfileData({
        accountType: $Enums.AccountType.BUSINESS,
        personalDetails: null,
        organizationDetails: { name: null },
        addressDetails: { country: `DE` },
      }),
    ).toBe(true);
    expect(
      hasMissingProfileData({
        accountType: $Enums.AccountType.CONTRACTOR,
        personalDetails: { firstName: `Ada`, lastName: `Lovelace` },
        organizationDetails: null,
        addressDetails: { country: `GB` },
      }),
    ).toBe(false);
  });
});
