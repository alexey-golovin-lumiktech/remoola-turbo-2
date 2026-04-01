import { $Enums } from '@remoola/database-2';

import { ConsumerPaymentMethodsService } from './consumer-payment-methods.service';

describe(`ConsumerPaymentMethodsService`, () => {
  const consumerId = `consumer-1`;

  it(`marks only Stripe-backed cards as reusable for payer payments`, async () => {
    const prisma = {
      paymentMethodModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `pm-manual-card`,
            consumerId,
            type: $Enums.PaymentMethodType.CREDIT_CARD,
            brand: `Manual Probe`,
            last4: `9999`,
            expMonth: `12`,
            expYear: `2034`,
            defaultSelected: false,
            stripePaymentMethodId: null,
            billingDetails: null,
          },
          {
            id: `pm-reusable-card`,
            consumerId,
            type: $Enums.PaymentMethodType.CREDIT_CARD,
            brand: `visa`,
            last4: `4242`,
            expMonth: `12`,
            expYear: `2034`,
            defaultSelected: true,
            stripePaymentMethodId: `pm_stripe`,
            billingDetails: null,
          },
          {
            id: `pm-bank`,
            consumerId,
            type: $Enums.PaymentMethodType.BANK_ACCOUNT,
            brand: `Test Bank`,
            last4: `6789`,
            expMonth: null,
            expYear: null,
            defaultSelected: true,
            stripePaymentMethodId: null,
            billingDetails: null,
          },
        ]),
      },
    } as any;

    const service = new ConsumerPaymentMethodsService(prisma);

    await expect(service.list(consumerId)).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: `pm-manual-card`,
          reusableForPayerPayments: false,
        }),
        expect.objectContaining({
          id: `pm-reusable-card`,
          reusableForPayerPayments: true,
        }),
        expect.objectContaining({
          id: `pm-bank`,
          reusableForPayerPayments: false,
        }),
      ],
    });
  });

  it(`honors defaultSelected when creating a new manual method`, async () => {
    const tx = {
      billingDetailsModel: {
        create: jest.fn().mockResolvedValue({ id: `billing-1` }),
      },
      paymentMethodModel: {
        count: jest.fn().mockResolvedValue(1),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: `pm-2`, defaultSelected: true }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    } as any;

    const service = new ConsumerPaymentMethodsService(prisma);

    await service.createManual(consumerId, {
      type: $Enums.PaymentMethodType.BANK_ACCOUNT,
      brand: `Backup Bank`,
      last4: `4321`,
      billingName: `Alexey Golovin`,
      defaultSelected: true,
    });

    expect(tx.paymentMethodModel.updateMany).toHaveBeenCalledWith({
      where: { consumerId, deletedAt: null, type: $Enums.PaymentMethodType.BANK_ACCOUNT },
      data: { defaultSelected: false },
    });
    expect(tx.paymentMethodModel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        consumerId,
        brand: `Backup Bank`,
        defaultSelected: true,
      }),
    });
  });

  it(`promotes a fallback method when deleting the current default`, async () => {
    const tx = {
      paymentMethodModel: {
        update: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn().mockResolvedValue({ id: `pm-fallback` }),
      },
    };
    const prisma = {
      paymentMethodModel: {
        findFirst: jest.fn().mockResolvedValue({
          id: `pm-default`,
          consumerId,
          type: $Enums.PaymentMethodType.BANK_ACCOUNT,
          defaultSelected: true,
        }),
      },
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    } as any;

    const service = new ConsumerPaymentMethodsService(prisma);

    await service.delete(consumerId, `pm-default`);

    expect(tx.paymentMethodModel.findFirst).toHaveBeenCalledWith({
      where: { consumerId, deletedAt: null, type: $Enums.PaymentMethodType.BANK_ACCOUNT },
      orderBy: { createdAt: `desc` },
      select: { id: true },
    });
    expect(tx.paymentMethodModel.update).toHaveBeenNthCalledWith(2, {
      where: { id: `pm-fallback` },
      data: { defaultSelected: true },
    });
  });

  it(`keeps bank default when a card becomes default`, async () => {
    const tx = {
      billingDetailsModel: {
        create: jest.fn().mockResolvedValue({ id: `billing-2` }),
      },
      paymentMethodModel: {
        count: jest.fn().mockResolvedValue(1),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: `pm-card`, defaultSelected: true }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    } as any;

    const service = new ConsumerPaymentMethodsService(prisma);

    await service.createManual(consumerId, {
      type: $Enums.PaymentMethodType.CREDIT_CARD,
      brand: `Visa`,
      last4: `4242`,
      expMonth: `12`,
      expYear: `2030`,
      billingName: `Alexey Golovin`,
      defaultSelected: true,
    });

    expect(tx.paymentMethodModel.count).toHaveBeenCalledWith({
      where: {
        consumerId,
        deletedAt: null,
        type: $Enums.PaymentMethodType.CREDIT_CARD,
        defaultSelected: true,
      },
    });
    expect(tx.paymentMethodModel.updateMany).toHaveBeenCalledWith({
      where: { consumerId, deletedAt: null, type: $Enums.PaymentMethodType.CREDIT_CARD },
      data: { defaultSelected: false },
    });
  });
});
