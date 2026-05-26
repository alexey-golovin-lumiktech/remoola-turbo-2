import { $Enums, Prisma } from '@remoola/database-2';

import { ConsumerExchangeExecutionRepository } from './consumer-exchange-execution.repository';

function createKnownRequestError(code: string) {
  const error = Object.assign(new Error(`prisma error`), { code });
  Object.setPrototypeOf(error, Prisma.PrismaClientKnownRequestError.prototype);
  return error;
}

describe(`ConsumerExchangeExecutionRepository`, () => {
  it(`returns an existing target entry before opening a transaction`, async () => {
    const prisma = {
      ledgerEntryModel: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: `target-entry`,
            ledgerId: `ledger-1`,
            amount: `95`,
            metadata: { rate: 0.95 },
          })
          .mockResolvedValueOnce(null),
      },
      $transaction: jest.fn(),
    } as any;
    const repository = new ConsumerExchangeExecutionRepository(prisma);

    const result = await repository.executeExchange({
      consumerId: `consumer-1`,
      from: $Enums.CurrencyCode.USD,
      to: $Enums.CurrencyCode.EUR,
      amount: 100,
      rate: 0.95,
      metadata: { source: `scheduled` },
      sourceIdempotencyKey: `scheduled:1:source`,
      targetIdempotencyKey: `scheduled:1:target`,
      assertSufficientBalance: jest.fn(),
    });

    expect(result).toEqual({
      from: $Enums.CurrencyCode.USD,
      to: $Enums.CurrencyCode.EUR,
      rate: 0.95,
      sourceAmount: 100,
      targetAmount: 95,
      ledgerId: `ledger-1`,
      entryId: `target-entry`,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it(`owns the transaction, advisory lock, balance assertion, and paired ledger writes`, async () => {
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
      ledgerEntryModel: {
        create: jest
          .fn()
          .mockResolvedValueOnce({ id: `source-entry`, ledgerId: `ledger-1`, amount: `-100` })
          .mockResolvedValueOnce({ id: `target-entry`, ledgerId: `ledger-1`, amount: `92` }),
      },
    };
    const prisma = {
      ledgerEntryModel: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    } as any;
    const repository = new ConsumerExchangeExecutionRepository(prisma);
    const assertSufficientBalance = jest.fn().mockResolvedValue(undefined);

    const result = await repository.executeExchange({
      consumerId: `consumer-1`,
      from: $Enums.CurrencyCode.USD,
      to: $Enums.CurrencyCode.EUR,
      amount: 100,
      rate: 0.92,
      metadata: { source: `manual`, rate: 0.92 },
      assertSufficientBalance,
    });

    expect(assertSufficientBalance).toHaveBeenCalledWith(tx);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    const createMock = tx.ledgerEntryModel.create as jest.Mock;
    const firstCallAmount = createMock.mock.calls[0][0].data.amount as Prisma.Decimal;
    const secondCallAmount = createMock.mock.calls[1][0].data.amount as Prisma.Decimal;
    expect(firstCallAmount).toBeInstanceOf(Prisma.Decimal);
    expect(firstCallAmount.toString()).toBe(`-100`);
    expect(secondCallAmount).toBeInstanceOf(Prisma.Decimal);
    expect(secondCallAmount.toString()).toBe(`92`);
    expect(tx.ledgerEntryModel.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          consumerId: `consumer-1`,
          currencyCode: $Enums.CurrencyCode.USD,
        }),
      }),
    );
    expect(tx.ledgerEntryModel.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          consumerId: `consumer-1`,
          currencyCode: $Enums.CurrencyCode.EUR,
        }),
      }),
    );
    expect(result).toEqual({
      from: $Enums.CurrencyCode.USD,
      to: $Enums.CurrencyCode.EUR,
      rate: 0.92,
      sourceAmount: 100,
      targetAmount: 92,
      ledgerId: expect.any(String),
      entryId: `target-entry`,
    });
    expect(tx.ledgerEntryModel.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          ledgerId: result.ledgerId,
        }),
      }),
    );
    expect(tx.ledgerEntryModel.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          ledgerId: result.ledgerId,
        }),
      }),
    );
  });

  it(`recovers from a duplicate target insert when the source entry already exists`, async () => {
    const existingSource = {
      id: `source-entry`,
      ledgerId: `ledger-1`,
      amount: `-100`,
      metadata: { rate: 0.95, source: `scheduled` },
    };
    const recoveredTarget = {
      id: `target-entry`,
      ledgerId: `ledger-1`,
      amount: `95`,
      metadata: { rate: 0.95 },
    };
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
      ledgerEntryModel: {
        findFirst: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(recoveredTarget),
        create: jest.fn().mockRejectedValue(createKnownRequestError(`P2002`)),
      },
    };
    const prisma = {
      ledgerEntryModel: {
        findFirst: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(existingSource),
      },
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    } as any;
    const repository = new ConsumerExchangeExecutionRepository(prisma);

    const result = await repository.executeExchange({
      consumerId: `consumer-1`,
      from: $Enums.CurrencyCode.USD,
      to: $Enums.CurrencyCode.EUR,
      amount: 100,
      rate: 0.95,
      metadata: { source: `scheduled` },
      sourceIdempotencyKey: `scheduled:1:source`,
      targetIdempotencyKey: `scheduled:1:target`,
      assertSufficientBalance: jest.fn(),
    });

    expect(result).toEqual({
      from: $Enums.CurrencyCode.USD,
      to: $Enums.CurrencyCode.EUR,
      rate: 0.95,
      sourceAmount: 100,
      targetAmount: 95,
      ledgerId: `ledger-1`,
      entryId: `target-entry`,
    });
  });
});
