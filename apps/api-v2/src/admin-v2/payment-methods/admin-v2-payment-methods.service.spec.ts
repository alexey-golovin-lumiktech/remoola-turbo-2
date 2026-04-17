import { BadRequestException, ConflictException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { AdminV2PaymentMethodsService } from './admin-v2-payment-methods.service';

describe(`AdminV2PaymentMethodsService`, () => {
  function buildService() {
    const queryRaw = jest.fn();
    const paymentMethodModel = {
      findMany: jest.fn(async () => []),
      count: jest.fn(async () => 0),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
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
      paymentMethodDuplicateEscalationModel,
      adminActionAuditLogModel,
      $transaction: jest.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)),
    };
    const idempotency = {
      execute: jest.fn(async ({ execute }: { execute: () => Promise<unknown> }) => execute()),
    };
    return {
      service: new AdminV2PaymentMethodsService(prisma as never, idempotency as never),
      prisma,
      paymentMethodModel,
      paymentMethodDuplicateEscalationModel,
      adminActionAuditLogModel,
      idempotency,
      queryRaw,
    };
  }

  it(`keeps list filters inside schema-backed read scope`, async () => {
    const { service, paymentMethodModel } = buildService();

    await service.listPaymentMethods({
      page: 2,
      pageSize: 10,
      consumerId: `consumer-1`,
      type: `BANK_ACCOUNT`,
      defaultSelected: true,
      fingerprint: `fp-1`,
      includeDeleted: true,
    });

    expect(paymentMethodModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        where: {
          consumerId: `consumer-1`,
          type: $Enums.PaymentMethodType.BANK_ACCOUNT,
          defaultSelected: true,
          stripeFingerprint: `fp-1`,
        },
      }),
    );
    expect(paymentMethodModel.count).toHaveBeenCalledWith({
      where: {
        consumerId: `consumer-1`,
        type: $Enums.PaymentMethodType.BANK_ACCOUNT,
        defaultSelected: true,
        stripeFingerprint: `fp-1`,
      },
    });
  });

  it(`returns only schema-backed detail fields and fingerprint duplicates`, async () => {
    const { service, paymentMethodModel, paymentMethodDuplicateEscalationModel } = buildService();
    paymentMethodModel.findFirst.mockResolvedValue({
      id: `pm-1`,
      type: $Enums.PaymentMethodType.CREDIT_CARD,
      stripePaymentMethodId: `stripe-pm-1`,
      stripeFingerprint: `fp-shared`,
      defaultSelected: true,
      disabledBy: `admin-9`,
      disabledAt: new Date(`2026-04-16T09:30:00.000Z`),
      brand: `Visa`,
      last4: `4242`,
      expMonth: `04`,
      expYear: `2030`,
      bankName: null,
      bankLast4: null,
      bankCountry: null,
      bankCurrency: null,
      serviceFee: 0,
      createdAt: new Date(`2026-04-16T08:00:00.000Z`),
      updatedAt: new Date(`2026-04-16T09:00:00.000Z`),
      deletedAt: new Date(`2026-04-16T10:00:00.000Z`),
      consumer: {
        id: `consumer-1`,
        email: `owner@example.com`,
      },
      billingDetails: {
        id: `billing-1`,
        email: `billing@example.com`,
        name: `Owner`,
        phone: `+10000000000`,
        deletedAt: null,
      },
      duplicateEscalations: [
        {
          id: `esc-1`,
          fingerprint: `fp-shared`,
          duplicateCount: 2,
          duplicatePaymentMethodIds: [`pm-2`],
          createdAt: new Date(`2026-04-16T11:00:00.000Z`),
          escalatedByAdmin: {
            id: `admin-2`,
            email: `super@example.com`,
          },
        },
      ],
    });
    paymentMethodModel.findMany.mockResolvedValue([
      {
        id: `pm-2`,
        type: $Enums.PaymentMethodType.CREDIT_CARD,
        brand: `Visa`,
        last4: `1111`,
        bankLast4: null,
        defaultSelected: false,
        createdAt: new Date(`2026-04-15T08:00:00.000Z`),
        deletedAt: null,
        consumer: {
          id: `consumer-2`,
          email: `other@example.com`,
        },
      },
    ]);
    paymentMethodDuplicateEscalationModel.findUnique.mockResolvedValue(null);

    const paymentMethod = await service.getPaymentMethodCase(`pm-1`);

    expect(paymentMethodModel.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: `pm-1` },
      }),
    );
    expect(paymentMethodModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          stripeFingerprint: `fp-shared`,
          id: { not: `pm-1` },
        },
      }),
    );
    expect(paymentMethod).toEqual({
      id: `pm-1`,
      type: `CREDIT_CARD`,
      status: `DISABLED`,
      stripePaymentMethodId: `stripe-pm-1`,
      stripeFingerprint: `fp-shared`,
      defaultSelected: true,
      version: new Date(`2026-04-16T09:00:00.000Z`).getTime(),
      brand: `Visa`,
      last4: `4242`,
      expMonth: `04`,
      expYear: `2030`,
      bankName: null,
      bankLast4: null,
      bankCountry: null,
      bankCurrency: null,
      serviceFee: 0,
      createdAt: `2026-04-16T08:00:00.000Z`,
      updatedAt: `2026-04-16T09:00:00.000Z`,
      disabledAt: `2026-04-16T09:30:00.000Z`,
      disabledBy: `admin-9`,
      deletedAt: `2026-04-16T10:00:00.000Z`,
      consumer: {
        id: `consumer-1`,
        email: `owner@example.com`,
      },
      billingDetails: {
        id: `billing-1`,
        email: `billing@example.com`,
        name: `Owner`,
        phone: `+10000000000`,
        deletedAt: null,
      },
      duplicateEscalation: {
        id: `esc-1`,
        fingerprint: `fp-shared`,
        duplicateCount: 2,
        duplicatePaymentMethodIds: [`pm-2`],
        createdAt: `2026-04-16T11:00:00.000Z`,
        escalatedBy: {
          id: `admin-2`,
          email: `super@example.com`,
        },
      },
      fingerprintDuplicates: [
        {
          id: `pm-2`,
          type: `CREDIT_CARD`,
          brand: `Visa`,
          last4: `1111`,
          bankLast4: null,
          defaultSelected: false,
          createdAt: `2026-04-15T08:00:00.000Z`,
          deletedAt: null,
          consumer: {
            id: `consumer-2`,
            email: `other@example.com`,
          },
        },
      ],
    });
  });

  it(`does not invent fingerprint duplicate rows when fingerprint is absent`, async () => {
    const { service, paymentMethodModel } = buildService();
    paymentMethodModel.findFirst.mockResolvedValue({
      id: `pm-bank-1`,
      type: $Enums.PaymentMethodType.BANK_ACCOUNT,
      stripePaymentMethodId: null,
      stripeFingerprint: null,
      defaultSelected: false,
      disabledBy: null,
      disabledAt: null,
      brand: null,
      last4: null,
      expMonth: null,
      expYear: null,
      bankName: `Bank`,
      bankLast4: `6789`,
      bankCountry: `US`,
      bankCurrency: $Enums.CurrencyCode.USD,
      serviceFee: 0,
      createdAt: new Date(`2026-04-16T08:00:00.000Z`),
      updatedAt: new Date(`2026-04-16T09:00:00.000Z`),
      deletedAt: null,
      consumer: {
        id: `consumer-1`,
        email: `owner@example.com`,
      },
      billingDetails: null,
      duplicateEscalations: [],
    });

    const paymentMethod = await service.getPaymentMethodCase(`pm-bank-1`);

    expect(paymentMethodModel.findMany).not.toHaveBeenCalled();
    expect(paymentMethod.fingerprintDuplicates).toEqual([]);
    expect(paymentMethod.bankLast4).toBe(`6789`);
    expect(paymentMethod.duplicateEscalation).toBeNull();
  });

  it(`requires confirmation and reason for disable`, async () => {
    const { service } = buildService();

    await expect(
      service.disablePaymentMethod(`pm-1`, `admin-1`, { version: 1, confirmed: false, reason: `risk` }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.disablePaymentMethod(`pm-1`, `admin-1`, { version: 1, confirmed: true, reason: ` ` }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it(`routes disable through isolated idempotency scope and atomic audit`, async () => {
    const { service, paymentMethodModel, adminActionAuditLogModel, idempotency } = buildService();
    paymentMethodModel.findUnique.mockResolvedValueOnce({
      id: `pm-1`,
      consumerId: `consumer-1`,
      defaultSelected: true,
      disabledAt: null,
      deletedAt: null,
      updatedAt: new Date(`2026-04-16T09:00:00.000Z`),
    });
    paymentMethodModel.updateMany.mockResolvedValueOnce({ count: 1 });
    paymentMethodModel.findUniqueOrThrow.mockResolvedValueOnce({
      id: `pm-1`,
      consumerId: `consumer-1`,
      defaultSelected: false,
      disabledAt: new Date(`2026-04-16T10:00:00.000Z`),
      updatedAt: new Date(`2026-04-16T10:00:00.000Z`),
    });

    const result = await service.disablePaymentMethod(
      `pm-1`,
      `admin-1`,
      { version: new Date(`2026-04-16T09:00:00.000Z`).getTime(), confirmed: true, reason: `Fraud signal` },
      { idempotencyKey: `idem-1`, ipAddress: `127.0.0.1`, userAgent: `jest` },
    );

    expect(idempotency.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: `admin-1`,
        scope: `payment-method-disable:pm-1`,
        key: `idem-1`,
      }),
    );
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
          resource: `payment_method`,
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
        defaultCleared: true,
      }),
    );
  });

  it(`treats remove-default as idempotent when the marker is already absent`, async () => {
    const { service, paymentMethodModel } = buildService();
    paymentMethodModel.findUnique.mockResolvedValueOnce({
      id: `pm-1`,
      consumerId: `consumer-1`,
      defaultSelected: false,
      disabledAt: null,
      deletedAt: null,
      updatedAt: new Date(`2026-04-16T09:00:00.000Z`),
    });

    const result = await service.removeDefaultPaymentMethod(`pm-1`, `admin-1`, {
      version: new Date(`2026-04-16T09:00:00.000Z`).getTime(),
    });

    expect(result).toEqual({
      paymentMethodId: `pm-1`,
      consumerId: `consumer-1`,
      defaultSelected: false,
      status: `ACTIVE`,
      version: new Date(`2026-04-16T09:00:00.000Z`).getTime(),
      alreadyNotDefault: true,
    });
  });

  it(`rejects duplicate escalation without a real fingerprint cohort`, async () => {
    const { service, paymentMethodModel } = buildService();
    paymentMethodModel.findUnique.mockResolvedValueOnce({
      id: `pm-1`,
      consumerId: `consumer-1`,
      stripeFingerprint: null,
      deletedAt: null,
      disabledAt: null,
      updatedAt: new Date(`2026-04-16T09:00:00.000Z`),
    });

    await expect(
      service.escalateDuplicatePaymentMethod(`pm-1`, `admin-1`, {
        version: new Date(`2026-04-16T09:00:00.000Z`).getTime(),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it(`rejects duplicate escalation for soft-deleted methods even if the UI hides the affordance`, async () => {
    const { service, paymentMethodModel, queryRaw } = buildService();
    paymentMethodModel.findUnique.mockResolvedValueOnce({
      id: `pm-1`,
      consumerId: `consumer-1`,
      stripeFingerprint: `fp-shared`,
      deletedAt: new Date(`2026-04-16T09:05:00.000Z`),
      disabledAt: null,
      updatedAt: new Date(`2026-04-16T09:00:00.000Z`),
    });
    paymentMethodModel.findMany.mockResolvedValueOnce([{ id: `pm-2` }]);
    queryRaw.mockResolvedValueOnce([
      {
        id: `pm-1`,
        consumer_id: `consumer-1`,
        stripe_fingerprint: `fp-shared`,
        deleted_at: new Date(`2026-04-16T09:05:00.000Z`),
        disabled_at: null,
        updated_at: new Date(`2026-04-16T09:00:00.000Z`),
      },
    ]);

    await expect(
      service.escalateDuplicatePaymentMethod(`pm-1`, `admin-1`, {
        version: new Date(`2026-04-16T09:00:00.000Z`).getTime(),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it(`creates a durable duplicate escalation record and audit entry`, async () => {
    const { service, paymentMethodModel, paymentMethodDuplicateEscalationModel, adminActionAuditLogModel, queryRaw } =
      buildService();
    paymentMethodModel.findUnique.mockResolvedValueOnce({
      id: `pm-1`,
      consumerId: `consumer-1`,
      stripeFingerprint: `fp-shared`,
      deletedAt: null,
      disabledAt: null,
      updatedAt: new Date(`2026-04-16T09:00:00.000Z`),
    });
    paymentMethodModel.findMany.mockResolvedValueOnce([{ id: `pm-2` }, { id: `pm-3` }]);
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

    const result = await service.escalateDuplicatePaymentMethod(`pm-1`, `admin-1`, {
      version: new Date(`2026-04-16T09:00:00.000Z`).getTime(),
    });

    expect(paymentMethodDuplicateEscalationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentMethodId: `pm-1`,
          fingerprint: `fp-shared`,
          duplicateCount: 3,
          duplicatePaymentMethodIds: [`pm-2`, `pm-3`],
          escalatedBy: `admin-1`,
        }),
      }),
    );
    expect(adminActionAuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: `payment_method_duplicate_escalate`,
          resourceId: `pm-1`,
        }),
      }),
    );
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

  it(`rejects duplicate escalation on stale version after the row lock resolves the latest state`, async () => {
    const { service, paymentMethodModel, queryRaw } = buildService();
    paymentMethodModel.findUnique.mockResolvedValueOnce({
      id: `pm-1`,
      consumerId: `consumer-1`,
      stripeFingerprint: `fp-shared`,
      deletedAt: null,
      disabledAt: null,
      updatedAt: new Date(`2026-04-16T09:00:00.000Z`),
    });
    paymentMethodModel.findMany.mockResolvedValueOnce([{ id: `pm-2` }]);
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
      service.escalateDuplicatePaymentMethod(`pm-1`, `admin-1`, {
        version: new Date(`2026-04-16T09:00:00.000Z`).getTime(),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
