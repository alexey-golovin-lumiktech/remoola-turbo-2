import { describe, expect, it, jest } from '@jest/globals';

import { $Enums } from '@remoola/database-2';

import { AdminV2ExchangeScheduledConversionQuery } from './admin-v2-exchange-scheduled-conversion.query';

describe(`AdminV2ExchangeScheduledConversionQuery`, () => {
  it(`lists scheduled conversions with consumer include and total count`, async () => {
    const count = jest.fn<(...a: any[]) => any>(async () => 2);
    const findMany = jest.fn<(...a: any[]) => any>(async () => []);
    const query = new AdminV2ExchangeScheduledConversionQuery({
      scheduledFxConversionModel: { count, findMany },
    } as never);

    await query.listScheduledConversions({
      where: { deletedAt: null },
      skip: 5,
      take: 10,
    });

    expect(count).toHaveBeenCalledWith({ where: { deletedAt: null } });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null },
        include: { consumer: { select: { id: true, email: true } } },
        orderBy: [{ executeAt: `desc` }, { id: `desc` }],
        skip: 5,
        take: 10,
      }),
    );
  });

  it(`loads linked ledger entries ordered oldest-first with latest outcome`, async () => {
    const findMany = jest.fn<(...a: any[]) => any>(async () => []);
    const query = new AdminV2ExchangeScheduledConversionQuery({
      ledgerEntryModel: { findMany },
    } as never);

    await query.listLinkedLedgerEntries(`ledger-1`);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ledgerId: `ledger-1`, deletedAt: null },
        orderBy: [{ createdAt: `asc` }, { id: `asc` }],
        include: {
          outcomes: {
            orderBy: [{ createdAt: `desc` }, { id: `desc` }],
            take: 1,
          },
        },
      }),
    );
  });

  it(`builds a first-entry-per-ledger map for positive exchange entries`, async () => {
    const findMany = jest.fn<(...a: any[]) => any>(async () => [
      {
        id: `entry-1`,
        ledgerId: `ledger-1`,
        type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
        amount: { toString: () => `25.00` },
        currencyCode: $Enums.CurrencyCode.EUR,
      },
      {
        id: `entry-2`,
        ledgerId: `ledger-1`,
        type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
        amount: { toString: () => `20.00` },
        currencyCode: $Enums.CurrencyCode.GBP,
      },
    ]);
    const query = new AdminV2ExchangeScheduledConversionQuery({
      ledgerEntryModel: { findMany },
    } as never);

    const map = await query.loadLedgerEntryMap([`ledger-1`]);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ledgerId: { in: [`ledger-1`] },
          type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
        }),
      }),
    );
    expect(map.get(`ledger-1`)).toEqual({
      id: `entry-1`,
      type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
      amount: `25.00`,
      currencyCode: $Enums.CurrencyCode.EUR,
    });
  });
});
