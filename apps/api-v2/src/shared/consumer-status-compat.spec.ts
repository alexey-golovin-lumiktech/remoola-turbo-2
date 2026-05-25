import { describe, expect, it } from '@jest/globals';

import { $Enums } from '@remoola/database-2';

import { buildConsumerStatusFilter, normalizeConsumerFacingTransactionStatus } from './consumer-status-compat';

describe(`consumer-status-compat`, () => {
  describe(`normalizeConsumerFacingTransactionStatus`, () => {
    it(`maps WAITING_RECIPIENT_APPROVAL to WAITING`, () => {
      expect(normalizeConsumerFacingTransactionStatus($Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL)).toBe(
        $Enums.TransactionStatus.WAITING,
      );
    });

    it(`passes WAITING through`, () => {
      expect(normalizeConsumerFacingTransactionStatus($Enums.TransactionStatus.WAITING)).toBe(
        $Enums.TransactionStatus.WAITING,
      );
    });

    it(`passes PENDING through`, () => {
      expect(normalizeConsumerFacingTransactionStatus($Enums.TransactionStatus.PENDING)).toBe(
        $Enums.TransactionStatus.PENDING,
      );
    });

    it(`passes COMPLETED through`, () => {
      expect(normalizeConsumerFacingTransactionStatus($Enums.TransactionStatus.COMPLETED)).toBe(
        $Enums.TransactionStatus.COMPLETED,
      );
    });

    it(`passes DRAFT through`, () => {
      expect(normalizeConsumerFacingTransactionStatus($Enums.TransactionStatus.DRAFT)).toBe(
        $Enums.TransactionStatus.DRAFT,
      );
    });

    it(`passes DENIED through`, () => {
      expect(normalizeConsumerFacingTransactionStatus($Enums.TransactionStatus.DENIED)).toBe(
        $Enums.TransactionStatus.DENIED,
      );
    });

    it(`passes UNCOLLECTIBLE through`, () => {
      expect(normalizeConsumerFacingTransactionStatus($Enums.TransactionStatus.UNCOLLECTIBLE)).toBe(
        $Enums.TransactionStatus.UNCOLLECTIBLE,
      );
    });
  });

  describe(`buildConsumerStatusFilter`, () => {
    it(`returns undefined when status is omitted`, () => {
      expect(buildConsumerStatusFilter(undefined)).toBeUndefined();
    });

    it(`expands WAITING to include recipient-approval internal status`, () => {
      expect(buildConsumerStatusFilter($Enums.TransactionStatus.WAITING)).toEqual({
        in: [$Enums.TransactionStatus.WAITING, $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL],
      });
    });

    it(`returns PENDING as a single enum when requested`, () => {
      expect(buildConsumerStatusFilter($Enums.TransactionStatus.PENDING)).toBe($Enums.TransactionStatus.PENDING);
    });

    it(`returns COMPLETED as a single enum when requested`, () => {
      expect(buildConsumerStatusFilter($Enums.TransactionStatus.COMPLETED)).toBe($Enums.TransactionStatus.COMPLETED);
    });
  });
});
