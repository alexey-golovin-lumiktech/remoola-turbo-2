import { ConflictException } from '@nestjs/common';

import { AdminV2PaymentMethodsRepository } from './admin-v2-payment-methods.repository';

describe(`AdminV2PaymentMethodsRepository`, () => {
  function buildRepository() {
    const queryRaw = jest.fn();
    const paymentMethodModel = {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      updateMany: jest.fn(),
    };
    const paymentMethodDuplicateEscalationModel = {
      findUnique: jest.fn(),
      create: jest.fn(),
    };
    const adminActionAuditLogModel = {
      create: jest.fn(),
    };
    const tx = {
      $queryRaw: queryRaw,
      paymentMethodModel,
      paymentMethodDuplicateEscalationModel,
      adminActionAuditLogModel,
    };
    const prisma = {
      paymentMethodModel,
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };

    return {
      repository: new AdminV2PaymentMethodsRepository(
        prisma as never,
        { run: (callback: (tx: unknown) => Promise<unknown>) => prisma.$transaction(callback as never) } as never,
      ),
      prisma,
      tx,
      queryRaw,
      paymentMethodModel,
      paymentMethodDuplicateEscalationModel,
      adminActionAuditLogModel,
    };
  }

  it(`lists duplicate ids by fingerprint on the command path`, async () => {
    const { repository, paymentMethodModel } = buildRepository();
    paymentMethodModel.findMany.mockResolvedValueOnce([{ id: `pm-2` }, { id: `pm-3` }]);

    const duplicateIds = await repository.listFingerprintDuplicateIds(`fp-shared`, `pm-1`);

    expect(paymentMethodModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          stripeFingerprint: `fp-shared`,
          id: { not: `pm-1` },
        },
      }),
    );
    expect(duplicateIds).toEqual([`pm-2`, `pm-3`]);
  });

  it(`persists disable mutations atomically with audit write and fresh reread`, async () => {
    const { repository, paymentMethodModel, adminActionAuditLogModel } = buildRepository();
    paymentMethodModel.updateMany.mockResolvedValueOnce({ count: 1 });
    paymentMethodModel.findUniqueOrThrow.mockResolvedValueOnce({
      id: `pm-1`,
      consumerId: `consumer-1`,
      defaultSelected: false,
      disabledAt: new Date(`2026-04-16T10:00:00.000Z`),
      updatedAt: new Date(`2026-04-16T10:00:00.000Z`),
    });

    const result = await repository.disablePaymentMethod({
      paymentMethod: {
        id: `pm-1`,
        consumerId: `consumer-1`,
        defaultSelected: true,
        disabledAt: null,
        deletedAt: null,
        updatedAt: new Date(`2026-04-16T09:00:00.000Z`),
        stripeFingerprint: `fp-shared`,
      },
      adminId: `admin-1`,
      reason: `Fraud signal`,
      meta: { ipAddress: `127.0.0.1`, userAgent: `jest` },
    });

    expect(paymentMethodModel.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          disabledBy: `admin-1`,
          defaultSelected: false,
        }),
      }),
    );
    expect(adminActionAuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: `payment_method_disable`,
          resourceId: `pm-1`,
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        paymentMethodId: `pm-1`,
        consumerId: `consumer-1`,
        status: `DISABLED`,
        alreadyDisabled: false,
      }),
    );
  });

  it(`creates a durable duplicate escalation record after locking the row`, async () => {
    const { repository, queryRaw, paymentMethodDuplicateEscalationModel, adminActionAuditLogModel } = buildRepository();
    queryRaw.mockResolvedValueOnce([
      {
        id: `pm-1`,
        consumer_id: `consumer-1`,
        stripe_fingerprint: `fp-shared`,
        deleted_at: null,
        disabled_at: null,
        updated_at: new Date(`2026-04-16T09:00:00.000Z`),
      },
    ]);
    paymentMethodDuplicateEscalationModel.findUnique.mockResolvedValueOnce(null);
    paymentMethodDuplicateEscalationModel.create.mockResolvedValueOnce({
      id: `esc-1`,
      createdAt: new Date(`2026-04-16T10:00:00.000Z`),
      duplicateCount: 3,
      duplicatePaymentMethodIds: [`pm-2`, `pm-3`],
    });

    const result = await repository.escalateDuplicatePaymentMethod({
      paymentMethod: {
        id: `pm-1`,
        consumerId: `consumer-1`,
        updatedAt: new Date(`2026-04-16T09:00:00.000Z`),
      },
      fingerprint: `fp-shared`,
      duplicatePaymentMethodIds: [`pm-2`, `pm-3`],
      expectedVersion: new Date(`2026-04-16T09:00:00.000Z`).getTime(),
      adminId: `admin-1`,
    });

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(paymentMethodDuplicateEscalationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentMethodId: `pm-1`,
          fingerprint: `fp-shared`,
          duplicateCount: 3,
        }),
      }),
    );
    expect(adminActionAuditLogModel.create).toHaveBeenCalled();
    expect(result).toEqual({
      paymentMethodId: `pm-1`,
      consumerId: `consumer-1`,
      escalationId: `esc-1`,
      fingerprint: `fp-shared`,
      duplicateCount: 3,
      duplicatePaymentMethodIds: [`pm-2`, `pm-3`],
      createdAt: `2026-04-16T10:00:00.000Z`,
      alreadyEscalated: false,
    });
  });

  it(`rejects duplicate escalation on stale version after lock reread`, async () => {
    const { repository, queryRaw } = buildRepository();
    queryRaw.mockResolvedValueOnce([
      {
        id: `pm-1`,
        consumer_id: `consumer-1`,
        stripe_fingerprint: `fp-shared`,
        deleted_at: null,
        disabled_at: null,
        updated_at: new Date(`2026-04-16T10:00:00.000Z`),
      },
    ]);

    await expect(
      repository.escalateDuplicatePaymentMethod({
        paymentMethod: {
          id: `pm-1`,
          consumerId: `consumer-1`,
          updatedAt: new Date(`2026-04-16T09:00:00.000Z`),
        },
        fingerprint: `fp-shared`,
        duplicatePaymentMethodIds: [`pm-2`],
        expectedVersion: new Date(`2026-04-16T09:00:00.000Z`).getTime(),
        adminId: `admin-1`,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
