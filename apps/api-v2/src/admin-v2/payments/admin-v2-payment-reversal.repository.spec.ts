import { Test } from '@nestjs/testing';

import { $Enums, type Prisma } from '@remoola/database-2';

import { AdminV2PaymentReversalRepository } from './admin-v2-payment-reversal.repository';

describe(`AdminV2PaymentReversalRepository`, () => {
  function buildRepository() {
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
      ledgerEntryModel: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue(undefined),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      ledgerEntryOutcomeModel: {
        create: jest.fn().mockResolvedValue({ id: `outcome-1` }),
      },
    } as unknown as Prisma.TransactionClient & {
      ledgerEntryModel: {
        findMany: jest.Mock;
        findFirst: jest.Mock;
        create: jest.Mock;
        updateMany: jest.Mock;
      };
      ledgerEntryOutcomeModel: { create: jest.Mock };
    };
    const repository = new AdminV2PaymentReversalRepository();

    return { repository, tx };
  }

  it(`resolves from the Nest container`, async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AdminV2PaymentReversalRepository],
    }).compile();

    expect(moduleRef.get(AdminV2PaymentReversalRepository)).toBeInstanceOf(AdminV2PaymentReversalRepository);
  });

  it(`finalizes persisted refund reversal entries with the Stripe refund id`, async () => {
    const { repository, tx } = buildRepository();
    tx.ledgerEntryModel.findMany.mockResolvedValue([{ id: `payer-reversal` }, { id: `requester-reversal` }]);

    await repository.finalizeRefundReversal(tx, {
      ledgerId: `ledger-1`,
      adminId: `admin-1`,
      stripeRefundId: `re_123`,
      status: $Enums.TransactionStatus.COMPLETED,
    });

    expect(tx.ledgerEntryModel.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [`payer-reversal`, `requester-reversal`] } },
      data: { stripeId: `re_123`, updatedBy: `admin-1` },
    });
    expect(tx.ledgerEntryOutcomeModel.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          status: $Enums.TransactionStatus.COMPLETED,
          source: `stripe`,
          externalId: `admin-refund:re_123:COMPLETED`,
        }),
      }),
    );
  });

  it(`marks persisted refund reversal entries denied without duplicating the reversal rows`, async () => {
    const { repository, tx } = buildRepository();
    tx.ledgerEntryModel.findMany.mockResolvedValue([{ id: `payer-reversal` }, { id: `requester-reversal` }]);

    await repository.markRefundReversalDenied(tx, {
      ledgerId: `ledger-1`,
      idempotencyKeyBase: `base-1`,
    });

    expect(tx.ledgerEntryModel.updateMany).not.toHaveBeenCalled();
    expect(tx.ledgerEntryOutcomeModel.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          status: $Enums.TransactionStatus.DENIED,
          source: `stripe`,
          externalId: `admin-refund:base-1:failed`,
        }),
      }),
    );
    expect(tx.ledgerEntryOutcomeModel.create).toHaveBeenCalledTimes(2);
  });
});
