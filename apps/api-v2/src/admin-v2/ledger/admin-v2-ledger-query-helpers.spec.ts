import { describe, expect, it } from '@jest/globals';

import { $Enums } from '@remoola/database-2';

import {
  buildLedgerDisputesWhere,
  buildLedgerListWhere,
  buildRawPageNextCursor,
  parsePageIdRows,
  sortLedgerRowsToPageOrder,
} from './admin-v2-ledger-query-helpers';

describe(`admin v2 ledger query helpers`, () => {
  describe(`parsePageIdRows`, () => {
    it(`rejects invalid raw page row ids`, () => {
      expect(() => parsePageIdRows([{ id: `ledger-b`, created_at: new Date(`2026-04-13T02:00:00.000Z`) }])).toThrow(
        `ledger raw page row id must be a valid UUID`,
      );
    });

    it(`rejects invalid raw page row created_at values`, () => {
      expect(() =>
        parsePageIdRows([{ id: `11111111-1111-4111-8111-111111111111`, created_at: `2026-04-13T02:00:00.000Z` }]),
      ).toThrow(`ledger raw page row created_at must be a valid Date`);
    });
  });

  describe(`buildLedgerListWhere`, () => {
    it(`turns invalid optional UUID filters into a no-match predicate`, () => {
      expect(
        buildLedgerListWhere({
          cursor: null,
          paymentRequestId: `not-a-uuid`,
        }),
      ).toEqual(
        expect.objectContaining({
          deletedAt: null,
          id: { in: [] },
        }),
      );
    });

    it(`maps amount sign filters to the existing Prisma amount predicates`, () => {
      expect(buildLedgerListWhere({ cursor: null, amountSign: `positive` })).toEqual(
        expect.objectContaining({
          amount: { gt: 0 },
        }),
      );
      expect(buildLedgerListWhere({ cursor: null, amountSign: `negative` })).toEqual(
        expect.objectContaining({
          amount: { lt: 0 },
        }),
      );
      expect(buildLedgerListWhere({ cursor: null, amountSign: `zero` })).toEqual(
        expect.objectContaining({
          amount: { equals: 0 },
        }),
      );
    });
  });

  describe(`buildLedgerDisputesWhere`, () => {
    it(`preserves the current AND shape for createdAt, cursor, search, and relation filters`, () => {
      const dateFrom = new Date(`2026-04-01T00:00:00.000Z`);
      const dateTo = new Date(`2026-04-30T23:59:59.999Z`);
      const cursorCreatedAt = new Date(`2026-04-15T12:00:00.000Z`);

      expect(
        buildLedgerDisputesWhere({
          cursor: { createdAt: cursorCreatedAt, id: `dispute-row-9` },
          search: `dp_fixture_open`,
          consumerId: `consumer-1`,
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        }),
      ).toEqual({
        AND: [
          {
            createdAt: {
              gte: dateFrom,
              lte: dateTo,
            },
          },
          {
            OR: [
              { createdAt: { lt: cursorCreatedAt } },
              {
                AND: [{ createdAt: cursorCreatedAt }, { id: { lt: `dispute-row-9` } }],
              },
            ],
          },
          {
            OR: [{ stripeDisputeId: { contains: `dp_fixture_open`, mode: `insensitive` } }],
          },
          {
            ledgerEntry: {
              consumerId: `consumer-1`,
            },
          },
        ],
      });
    });

    it(`includes UUID search branches when the search value is a UUID`, () => {
      expect(
        buildLedgerDisputesWhere({
          cursor: null,
          search: `11111111-1111-4111-8111-111111111111`,
        }),
      ).toEqual({
        AND: [
          {
            OR: [
              {
                stripeDisputeId: {
                  contains: `11111111-1111-4111-8111-111111111111`,
                  mode: `insensitive`,
                },
              },
              { id: `11111111-1111-4111-8111-111111111111` },
              { ledgerEntryId: `11111111-1111-4111-8111-111111111111` },
            ],
          },
        ],
      });
    });
  });

  describe(`page ordering helpers`, () => {
    it(`restores hydrated rows to raw page order`, () => {
      const pageIds = [`11111111-1111-4111-8111-111111111111`, `22222222-2222-4222-8222-222222222222`];

      expect(
        sortLedgerRowsToPageOrder(pageIds, [
          { id: pageIds[1]!, status: $Enums.TransactionStatus.PENDING },
          { id: pageIds[0]!, status: $Enums.TransactionStatus.COMPLETED },
        ]),
      ).toEqual([
        { id: pageIds[0], status: $Enums.TransactionStatus.COMPLETED },
        { id: pageIds[1], status: $Enums.TransactionStatus.PENDING },
      ]);
    });

    it(`builds the raw-page next cursor from the lookahead row`, () => {
      expect(
        buildRawPageNextCursor(
          [
            { id: `11111111-1111-4111-8111-111111111111`, created_at: new Date(`2026-04-13T02:00:00.000Z`) },
            { id: `22222222-2222-4222-8222-222222222222`, created_at: new Date(`2026-04-13T01:00:00.000Z`) },
            { id: `33333333-3333-4333-8333-333333333333`, created_at: new Date(`2026-04-13T00:00:00.000Z`) },
          ],
          2,
        ),
      ).toEqual({
        createdAt: new Date(`2026-04-13T00:00:00.000Z`),
        id: `33333333-3333-4333-8333-333333333333`,
      });
      expect(buildRawPageNextCursor([], 25)).toBeNull();
    });
  });
});
