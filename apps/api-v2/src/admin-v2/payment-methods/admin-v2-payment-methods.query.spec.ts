import { describe, expect, it, jest } from '@jest/globals';

import { $Enums } from '@remoola/database-2';

import { AdminV2PaymentMethodsQuery } from './admin-v2-payment-methods.query';

describe(`AdminV2PaymentMethodsQuery`, () => {
  function buildQuery() {
    const paymentMethodModel = {
      findMany: jest.fn<(...a: any[]) => any>(async () => []),
      count: jest.fn<(...a: any[]) => any>(async () => 0),
      findFirst: jest.fn<(...a: any[]) => any>(),
    };
    const prisma = {
      paymentMethodModel,
    };

    return {
      query: new AdminV2PaymentMethodsQuery(prisma as never),
      paymentMethodModel,
    };
  }

  it(`keeps list filters inside schema-backed read scope`, async () => {
    const { query, paymentMethodModel } = buildQuery();

    await query.listPaymentMethods({
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

  it(`applies non-deleted scope by default for list queries`, async () => {
    const { query, paymentMethodModel } = buildQuery();

    await query.listPaymentMethods();

    expect(paymentMethodModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null },
      }),
    );
  });

  it(`loads the payment method case with duplicate escalation relation`, async () => {
    const { query, paymentMethodModel } = buildQuery();

    await query.getPaymentMethodCase(`pm-1`);

    expect(paymentMethodModel.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: `pm-1` },
        select: expect.objectContaining({
          duplicateEscalations: expect.any(Object),
          billingDetails: expect.any(Object),
        }),
      }),
    );
  });

  it(`loads fingerprint duplicates for the case view`, async () => {
    const { query, paymentMethodModel } = buildQuery();

    await query.listFingerprintDuplicates(`fp-shared`, `pm-1`);

    expect(paymentMethodModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          stripeFingerprint: `fp-shared`,
          id: { not: `pm-1` },
        },
      }),
    );
  });
});
