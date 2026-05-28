import { describe, expect, it, jest } from '@jest/globals';
jest.mock(`@remoola/security-utils`, () => ({
  newUuid: jest.fn<(...a: any[]) => any>(() => `00000000-0000-0000-0000-000000000ledger`),
}));

import { $Enums, Prisma } from '@remoola/database-2';

import { StripePaymentRequestLedgerBootstrapRepository } from './stripe-payment-request-ledger-bootstrap.repository';

describe(`StripePaymentRequestLedgerBootstrapRepository`, () => {
  function makeTx() {
    return {
      ledgerEntryModel: {
        create: jest.fn<(...a: any[]) => any>(async () => null) as jest.Mock<(...a: any[]) => any>,
      },
    };
  }

  function makeParams() {
    return {
      paymentRequest: {
        id: `pr-1`,
        requesterId: `requester-1`,
        amount: new Prisma.Decimal(`48.50`),
        currencyCode: $Enums.CurrencyCode.USD,
      },
      consumerId: `payer-1`,
    };
  }

  function makeP2002Error() {
    return new Prisma.PrismaClientKnownRequestError(`Unique constraint failed`, {
      code: `P2002`,
      clientVersion: `test`,
    });
  }

  it(`writes a negative USER_PAYMENT payer entry and a positive USER_DEPOSIT requester entry`, async () => {
    const tx = makeTx();
    const repository = new StripePaymentRequestLedgerBootstrapRepository();
    await repository.bootstrapInitialLedgerEntries({ tx: tx as never, ...makeParams() });

    expect(tx.ledgerEntryModel.create).toHaveBeenCalledTimes(2);

    const payer = tx.ledgerEntryModel.create.mock.calls[0]?.[0] as {
      data: {
        consumerId: string;
        type: $Enums.LedgerEntryType;
        amount: Prisma.Decimal;
        status: $Enums.TransactionStatus;
        idempotencyKey: string;
        metadata: Record<string, unknown>;
      };
    };
    const requester = tx.ledgerEntryModel.create.mock.calls[1]?.[0] as {
      data: {
        consumerId: string;
        type: $Enums.LedgerEntryType;
        amount: Prisma.Decimal;
        idempotencyKey: string;
        metadata: Record<string, unknown>;
      };
    };

    expect(payer.data.consumerId).toBe(`payer-1`);
    expect(payer.data.type).toBe($Enums.LedgerEntryType.USER_PAYMENT);
    expect(payer.data.amount.toString()).toBe(`-48.5`);
    expect(payer.data.status).toBe($Enums.TransactionStatus.PENDING);
    expect(payer.data.idempotencyKey).toBe(`pr:pr-1:payer`);
    expect(payer.data.metadata).toEqual({
      rail: $Enums.PaymentRail.CARD,
      counterpartyId: `requester-1`,
    });

    expect(requester.data.consumerId).toBe(`requester-1`);
    expect(requester.data.type).toBe($Enums.LedgerEntryType.USER_DEPOSIT);
    expect(requester.data.amount.toString()).toBe(`48.5`);
    expect(requester.data.idempotencyKey).toBe(`pr:pr-1:requester`);
    expect(requester.data.metadata).toEqual({
      rail: $Enums.PaymentRail.CARD,
      counterpartyId: `payer-1`,
    });

    // reconciliation invariant: debits + credits = 0 across the bootstrap pair
    expect(payer.data.amount.plus(requester.data.amount).toString()).toBe(`0`);
  });

  it(`treats P2002 on the payer entry as already-bootstrapped and still attempts the requester entry`, async () => {
    const tx = makeTx();
    tx.ledgerEntryModel.create.mockRejectedValueOnce(makeP2002Error());
    const repository = new StripePaymentRequestLedgerBootstrapRepository();

    await expect(
      repository.bootstrapInitialLedgerEntries({ tx: tx as never, ...makeParams() }),
    ).resolves.toBeUndefined();
    expect(tx.ledgerEntryModel.create).toHaveBeenCalledTimes(2);
  });

  it(`treats P2002 on the requester entry as already-bootstrapped`, async () => {
    const tx = makeTx();
    tx.ledgerEntryModel.create.mockResolvedValueOnce(null).mockRejectedValueOnce(makeP2002Error());
    const repository = new StripePaymentRequestLedgerBootstrapRepository();

    await expect(
      repository.bootstrapInitialLedgerEntries({ tx: tx as never, ...makeParams() }),
    ).resolves.toBeUndefined();
  });

  it(`rethrows non-P2002 known errors from either insert`, async () => {
    const tx = makeTx();
    tx.ledgerEntryModel.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError(`Foreign key violation`, {
        code: `P2003`,
        clientVersion: `test`,
      }),
    );
    const repository = new StripePaymentRequestLedgerBootstrapRepository();

    await expect(repository.bootstrapInitialLedgerEntries({ tx: tx as never, ...makeParams() })).rejects.toMatchObject({
      code: `P2003`,
    });
  });

  it(`rethrows non-Prisma errors verbatim`, async () => {
    const tx = makeTx();
    tx.ledgerEntryModel.create.mockRejectedValueOnce(new Error(`network down`));
    const repository = new StripePaymentRequestLedgerBootstrapRepository();

    await expect(repository.bootstrapInitialLedgerEntries({ tx: tx as never, ...makeParams() })).rejects.toThrow(
      `network down`,
    );
  });
});
