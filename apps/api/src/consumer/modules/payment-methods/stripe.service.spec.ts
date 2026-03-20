import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { ConsumerStripeService } from './stripe.service';
import { type PrismaService } from '../../../shared/prisma.service';

const createOutcomeIdempotentMock = jest.fn().mockResolvedValue(undefined);

jest.mock(`./ledger-outcome-idempotent`, () => ({
  createOutcomeIdempotent: (...args: unknown[]) => createOutcomeIdempotentMock(...args),
}));

describe(`ConsumerStripeService`, () => {
  let prisma: {
    paymentMethodModel: { findFirst: jest.Mock };
    ledgerEntryModel: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: ConsumerStripeService;
  let paymentIntentsCreate: jest.Mock;
  let paymentMethodsRetrieve: jest.Mock;
  let checkoutSessionsCreate: jest.Mock;

  beforeEach(() => {
    prisma = {
      paymentMethodModel: {
        findFirst: jest.fn().mockResolvedValue({
          id: `payment-method-1`,
          stripePaymentMethodId: `pm_1`,
          billingDetails: null,
        }),
      },
      ledgerEntryModel: {
        findMany: jest.fn().mockResolvedValue([{ id: `ledger-1` }]),
      },
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          ledgerEntryModel: {
            findMany: jest.fn().mockResolvedValue([{ id: `ledger-1` }]),
          },
          paymentRequestModel: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return callback(tx);
      }),
    };
    service = new ConsumerStripeService(prisma as unknown as PrismaService);
    paymentIntentsCreate = jest.fn();
    paymentMethodsRetrieve = jest.fn().mockResolvedValue({ customer: `cus_1` });
    checkoutSessionsCreate = jest.fn();
    (
      service as unknown as {
        stripe: {
          paymentMethods: { retrieve: jest.Mock };
          paymentIntents: { create: jest.Mock };
          checkout: { sessions: { create: jest.Mock } };
        };
      }
    ).stripe = {
      paymentMethods: { retrieve: paymentMethodsRetrieve },
      paymentIntents: { create: paymentIntentsCreate },
      checkout: { sessions: { create: checkoutSessionsCreate } },
    };
    jest
      .spyOn(
        service as unknown as { ensureStripeCustomer: (...args: unknown[]) => Promise<unknown> },
        `ensureStripeCustomer`,
      )
      .mockResolvedValue({ customerId: `cus_1`, consumer: { id: `consumer-1` } });
    jest
      .spyOn(
        service as unknown as { getPaymentRequestForPayer: (...args: unknown[]) => Promise<unknown> },
        `getPaymentRequestForPayer`,
      )
      .mockResolvedValue({
        id: `payment-request-1`,
        amount: 2500,
        currencyCode: `USD`,
        requester: { email: `requester@example.com` },
        requesterEmail: null,
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    createOutcomeIdempotentMock.mockClear();
  });

  it(`returns 503 and does not append denied outcome for transient failures`, async () => {
    paymentIntentsCreate.mockRejectedValue(new Error(`temporary stripe issue`));
    jest
      .spyOn(service as unknown as { isTransientStripeError: (error: unknown) => boolean }, `isTransientStripeError`)
      .mockReturnValue(true);

    await expect(
      service.payWithSavedPaymentMethod(
        `consumer-1`,
        `payment-request-1`,
        { paymentMethodId: `payment-method-1` },
        `key-1`,
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(createOutcomeIdempotentMock).not.toHaveBeenCalled();
  });

  it(`appends denied outcome only for terminal card declines`, async () => {
    paymentIntentsCreate.mockRejectedValue({ type: `StripeCardError` });
    jest
      .spyOn(service as unknown as { isTransientStripeError: (error: unknown) => boolean }, `isTransientStripeError`)
      .mockReturnValue(false);

    await expect(
      service.payWithSavedPaymentMethod(
        `consumer-1`,
        `payment-request-1`,
        { paymentMethodId: `payment-method-1` },
        `key-2`,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(createOutcomeIdempotentMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: $Enums.TransactionStatus.DENIED,
        source: `stripe`,
      }),
      expect.anything(),
    );
  });

  it(`uses a deterministic Stripe idempotency key for saved-method payments`, async () => {
    paymentIntentsCreate.mockResolvedValue({ id: `pi_1`, status: `succeeded` });
    prisma.paymentMethodModel.findFirst
      .mockResolvedValueOnce({
        id: `payment-method-1`,
        stripePaymentMethodId: `pm_1`,
        billingDetails: null,
      })
      .mockResolvedValueOnce({
        id: `payment-method-2`,
        stripePaymentMethodId: `pm_2`,
        billingDetails: null,
      });

    await service.payWithSavedPaymentMethod(
      `consumer-1`,
      `payment-request-1`,
      { paymentMethodId: `payment-method-1` },
      `client-key-a`,
    );
    await service.payWithSavedPaymentMethod(
      `consumer-1`,
      `payment-request-1`,
      { paymentMethodId: `payment-method-2` },
      `client-key-b`,
    );

    expect(paymentIntentsCreate).toHaveBeenCalledTimes(2);
    expect(paymentIntentsCreate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        metadata: expect.objectContaining({ clientIdempotencyKey: `client-key-a` }),
      }),
      expect.objectContaining({ idempotencyKey: `saved-method:payment-request-1` }),
    );
    expect(paymentIntentsCreate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        metadata: expect.objectContaining({
          paymentMethodId: `payment-method-2`,
          clientIdempotencyKey: `client-key-b`,
        }),
      }),
      expect.objectContaining({ idempotencyKey: `saved-method:payment-request-1` }),
    );
  });

  it(`uses a deterministic Stripe idempotency key for checkout sessions`, async () => {
    checkoutSessionsCreate.mockResolvedValue({ id: `cs_1`, url: `https://checkout.stripe.test/session` });

    const result = await service.createStripeSession(`consumer-1`, `payment-request-1`, `https://app.example.com`);

    expect(result).toEqual({ url: `https://checkout.stripe.test/session` });
    expect(checkoutSessionsCreate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ idempotencyKey: `checkout-session:payment-request-1` }),
    );
  });

  it(`creates Stripe customer with deterministic idempotency key and claim update`, async () => {
    const prismaForCustomer = {
      consumerModel: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id: `consumer-1`, email: `consumer@example.com`, stripeCustomerId: null })
          .mockResolvedValueOnce({ stripeCustomerId: `cus_existing` }),
        updateMany: jest.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 }),
      },
    } as unknown as PrismaService;
    const serviceForCustomer = new ConsumerStripeService(prismaForCustomer);
    const customersCreate = jest.fn().mockResolvedValue({ id: `cus_new` });
    (serviceForCustomer as unknown as { stripe: { customers: { create: jest.Mock } } }).stripe = {
      customers: { create: customersCreate },
    };

    await (
      serviceForCustomer as unknown as { ensureStripeCustomer: (consumerId: string) => Promise<unknown> }
    ).ensureStripeCustomer(`consumer-1`);

    expect(customersCreate).toHaveBeenCalledWith(
      { email: `consumer@example.com` },
      { idempotencyKey: `ensure-customer:consumer-1` },
    );
    expect(
      (prismaForCustomer as unknown as { consumerModel: { updateMany: jest.Mock } }).consumerModel.updateMany,
    ).toHaveBeenCalledWith({
      where: { id: `consumer-1`, stripeCustomerId: null },
      data: { stripeCustomerId: `cus_new` },
    });
  });
});
