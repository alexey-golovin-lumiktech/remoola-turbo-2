import { $Enums } from '@remoola/database-2';

import { buildLegacyConsumerStatusFilter, normalizeConsumerFacingTransactionStatus } from './status-compat';

describe(`legacy consumer payment status compatibility`, () => {
  it(`normalizes WAITING_RECIPIENT_APPROVAL to WAITING for consumer-facing reads`, () => {
    expect(normalizeConsumerFacingTransactionStatus($Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL)).toBe(
      $Enums.TransactionStatus.WAITING,
    );
    expect(normalizeConsumerFacingTransactionStatus($Enums.TransactionStatus.PENDING)).toBe(
      $Enums.TransactionStatus.PENDING,
    );
  });

  it(`keeps WAITING filters compatible with dormant WAITING_RECIPIENT_APPROVAL rows`, () => {
    expect(buildLegacyConsumerStatusFilter($Enums.TransactionStatus.WAITING)).toEqual({
      in: [$Enums.TransactionStatus.WAITING, $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL],
    });
    expect(buildLegacyConsumerStatusFilter($Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL)).toBe(
      $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
    );
  });
});
