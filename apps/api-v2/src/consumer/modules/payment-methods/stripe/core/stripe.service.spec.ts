import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { StripeCustomerAccessRepository } from './stripe-customer-access.repository';
import { StripePaymentOutcomesRepository } from './stripe-payment-outcomes.repository';
import { StripePaymentRequestAccessRepository } from './stripe-payment-request-access.repository';
import { StripePaymentRequestLedgerBootstrapRepository } from './stripe-payment-request-ledger-bootstrap.repository';
import { StripeSavedPaymentMethodsRepository } from './stripe-saved-payment-methods.repository';
import { StripeSetupIntentPersistenceRepository } from './stripe-setup-intent-persistence.repository';
import { ConsumerStripeService } from './stripe.service';
import { type PrismaService } from '../../../../../shared/prisma.service';

const createOutcomeIdempotentMock = jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined);

jest.mock(`./ledger-outcome-idempotent`, () => ({
  createOutcomeIdempotent: (...args: unknown[]) => createOutcomeIdempotentMock(...args),
}));

describe(`ConsumerStripeService`, () => {
  let prisma: {
    paymentMethodModel: { findFirst: jest.Mock<(...a: any[]) => any> };
  };
  let customerAccessRepository: {
    findConsumer: jest.Mock<(...a: any[]) => any>;
    claimStripeCustomerId: jest.Mock<(...a: any[]) => any>;
    findStripeCustomerId: jest.Mock<(...a: any[]) => any>;
  };
  let paymentRequestAccessRepository: {
    ensureCardPaymentRailForRequest: jest.Mock<(...a: any[]) => any>;
    markPaymentRequestCompletedForStripeRequest: jest.Mock<(...a: any[]) => any>;
    getPaymentRequestForPayer: jest.Mock<(...a: any[]) => any>;
  };
  let paymentOutcomesRepository: {
    appendCheckoutWaitingOutcomes: jest.Mock<(...a: any[]) => any>;
    markSavedMethodPaymentCompleted: jest.Mock<(...a: any[]) => any>;
    appendDeniedSavedMethodPaymentOutcomes: jest.Mock<(...a: any[]) => any>;
  };
  let service: ConsumerStripeService;
  let paymentIntentsCreate: jest.Mock<(...a: any[]) => any>;
  let paymentMethodsRetrieve: jest.Mock<(...a: any[]) => any>;
  let checkoutSessionsCreate: jest.Mock<(...a: any[]) => any>;
  let stripeClient: {
    paymentMethods: { retrieve: jest.Mock<(...a: any[]) => any> };
    paymentIntents: { create: jest.Mock<(...a: any[]) => any> };
    checkout: { sessions: { create: jest.Mock<(...a: any[]) => any> } };
  };

  beforeEach(() => {
    prisma = {
      paymentMethodModel: {
        findFirst: jest.fn<(...a: any[]) => any>().mockResolvedValue({
          id: `payment-method-1`,
          stripePaymentMethodId: `pm_1`,
          billingDetails: null,
        }),
      },
    };
    customerAccessRepository = {
      findConsumer: jest.fn<(...a: any[]) => any>(),
      claimStripeCustomerId: jest.fn<(...a: any[]) => any>(),
      findStripeCustomerId: jest.fn<(...a: any[]) => any>(),
    };
    paymentRequestAccessRepository = {
      ensureCardPaymentRailForRequest: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
      markPaymentRequestCompletedForStripeRequest: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
      getPaymentRequestForPayer: jest.fn<(...a: any[]) => any>(),
    };
    paymentOutcomesRepository = {
      appendCheckoutWaitingOutcomes: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
      markSavedMethodPaymentCompleted: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
      appendDeniedSavedMethodPaymentOutcomes: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
    };
    paymentIntentsCreate = jest.fn<(...a: any[]) => any>();
    paymentMethodsRetrieve = jest.fn<(...a: any[]) => any>().mockResolvedValue({ customer: `cus_1` });
    checkoutSessionsCreate = jest.fn<(...a: any[]) => any>();
    stripeClient = {
      paymentMethods: { retrieve: paymentMethodsRetrieve },
      paymentIntents: { create: paymentIntentsCreate },
      checkout: { sessions: { create: checkoutSessionsCreate } },
    };
    const savedPaymentMethodsRepository = new StripeSavedPaymentMethodsRepository(prisma as unknown as PrismaService);
    const setupIntentPersistenceRepository = new StripeSetupIntentPersistenceRepository(
      prisma as unknown as PrismaService,
    );
    service = new ConsumerStripeService(
      stripeClient as any,
      customerAccessRepository as unknown as StripeCustomerAccessRepository,
      paymentOutcomesRepository as unknown as StripePaymentOutcomesRepository,
      paymentRequestAccessRepository as unknown as StripePaymentRequestAccessRepository,
      savedPaymentMethodsRepository,
      setupIntentPersistenceRepository,
    );
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
        requesterId: `requester-1`,
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
    expect(paymentOutcomesRepository.appendDeniedSavedMethodPaymentOutcomes).not.toHaveBeenCalled();
    expect(paymentOutcomesRepository.markSavedMethodPaymentCompleted).not.toHaveBeenCalled();
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
    expect(paymentOutcomesRepository.appendDeniedSavedMethodPaymentOutcomes).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentRequestId: `payment-request-1`,
        logger: expect.anything(),
      }),
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
    expect(paymentOutcomesRepository.markSavedMethodPaymentCompleted).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        paymentRequestId: `payment-request-1`,
        paymentIntentId: `pi_1`,
        logger: expect.anything(),
      }),
    );
    expect(paymentOutcomesRepository.markSavedMethodPaymentCompleted).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        paymentRequestId: `payment-request-1`,
        paymentIntentId: `pi_1`,
        logger: expect.anything(),
      }),
    );
    expect(paymentRequestAccessRepository.markPaymentRequestCompletedForStripeRequest).not.toHaveBeenCalled();
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

  it(`preserves contract context in checkout success and cancel redirects`, async () => {
    checkoutSessionsCreate.mockResolvedValue({ id: `cs_ctx`, url: `https://checkout.stripe.test/session-ctx` });

    await service.createStripeSession(`consumer-1`, `payment-request-1`, `https://app.example.com`, {
      contractId: `contract-1`,
      returnTo: `/contracts/contract-1`,
    });

    expect(checkoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: `https://app.example.com/payments/payment-request-1?contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1&success=1`,
        cancel_url: `https://app.example.com/payments/payment-request-1?contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1&canceled=1`,
      }),
      expect.any(Object),
    );
  });

  it(`stamps late-selected card payments with CARD rail when opening checkout`, async () => {
    checkoutSessionsCreate.mockResolvedValue({ id: `cs_2`, url: `https://checkout.stripe.test/session-2` });

    await service.createStripeSession(`consumer-1`, `payment-request-1`, `https://app.example.com`);

    expect(paymentRequestAccessRepository.ensureCardPaymentRailForRequest).toHaveBeenCalledWith(
      `payment-request-1`,
      `consumer-1`,
    );
    expect(paymentOutcomesRepository.appendCheckoutWaitingOutcomes).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentRequestId: `payment-request-1`,
        checkoutSessionId: `cs_2`,
        logger: expect.anything(),
      }),
    );
  });

  it(`delegates bootstrap-capable claim flows while opening checkout`, async () => {
    const txPaymentRequestUpdateManyForClaim = jest.fn<(...a: any[]) => any>().mockResolvedValue({ count: 1 });
    const bootstrapInitialLedgerEntries = jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined);
    const prismaForClaim = {
      consumerModel: {
        findUnique: jest.fn<(...a: any[]) => any>().mockResolvedValue({ email: `payer@example.com` }),
      },
      ledgerEntryModel: {
        findMany: jest.fn<(...a: any[]) => any>().mockResolvedValue([]),
      },
      paymentRequestModel: {
        findUnique: jest.fn<(...a: any[]) => any>().mockResolvedValue({
          id: `payment-request-claim`,
          payerId: `consumer-1`,
          status: $Enums.TransactionStatus.PENDING,
          currencyCode: $Enums.CurrencyCode.USD,
          ledgerEntries: [],
          requester: { email: `requester@example.com` },
          requesterEmail: null,
        }),
        updateMany: txPaymentRequestUpdateManyForClaim,
      },
      $transaction: jest
        .fn<(...a: any[]) => any>()
        .mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
          return callback({
            paymentRequestModel: {
              findUnique: jest.fn<(...a: any[]) => any>().mockResolvedValue({
                id: `payment-request-claim`,
                payerId: null,
                payerEmail: `payer@example.com`,
                requesterId: `requester-1`,
                amount: 25,
                currencyCode: $Enums.CurrencyCode.USD,
                status: $Enums.TransactionStatus.PENDING,
                ledgerEntries: [],
              }),
              updateMany: txPaymentRequestUpdateManyForClaim,
            },
          });
        }),
    } as any;
    const serviceForClaim = new ConsumerStripeService(
      {
        checkout: {
          sessions: {
            create: jest.fn<(...a: any[]) => any>().mockResolvedValue({ id: `cs_1`, url: `https://stripe.test/cs_1` }),
          },
        },
      } as any,
      {} as StripeCustomerAccessRepository,
      {
        appendCheckoutWaitingOutcomes: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
        markSavedMethodPaymentCompleted: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
        appendDeniedSavedMethodPaymentOutcomes: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
      } as unknown as StripePaymentOutcomesRepository,
      new StripePaymentRequestAccessRepository(
        prismaForClaim as unknown as PrismaService,
        { bootstrapInitialLedgerEntries } as unknown as StripePaymentRequestLedgerBootstrapRepository,
      ),
      new StripeSavedPaymentMethodsRepository(prismaForClaim as unknown as PrismaService),
      new StripeSetupIntentPersistenceRepository(prismaForClaim as unknown as PrismaService),
    );
    jest
      .spyOn(
        serviceForClaim as unknown as { ensureStripeCustomer: (...args: unknown[]) => Promise<unknown> },
        `ensureStripeCustomer`,
      )
      .mockResolvedValue({ customerId: `cus_1`, consumer: { id: `consumer-1` } });

    await serviceForClaim.createStripeSession(`consumer-1`, `payment-request-claim`, `https://app.example.com`);

    expect(bootstrapInitialLedgerEntries).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentRequest: expect.objectContaining({
          requesterId: `requester-1`,
          amount: 25,
        }),
      }),
    );
  });

  it(`creates Stripe customer with deterministic idempotency key and claim update`, async () => {
    const customersCreate = jest.fn<(...a: any[]) => any>().mockResolvedValue({ id: `cus_new` });
    const customerAccessRepositoryForCustomer = {
      findConsumer: jest.fn<(...a: any[]) => any>().mockResolvedValue({
        id: `consumer-1`,
        email: `consumer@example.com`,
        stripeCustomerId: null,
      }),
      claimStripeCustomerId: jest.fn<(...a: any[]) => any>().mockResolvedValue(true),
      findStripeCustomerId: jest.fn<(...a: any[]) => any>(),
    };
    const serviceForCustomer = new ConsumerStripeService(
      {
        customers: { create: customersCreate },
      } as any,
      customerAccessRepositoryForCustomer as unknown as StripeCustomerAccessRepository,
      {
        appendCheckoutWaitingOutcomes: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
        markSavedMethodPaymentCompleted: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
        appendDeniedSavedMethodPaymentOutcomes: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
      } as unknown as StripePaymentOutcomesRepository,
      {} as StripePaymentRequestAccessRepository,
      {} as StripeSavedPaymentMethodsRepository,
      {} as StripeSetupIntentPersistenceRepository,
    );

    await (
      serviceForCustomer as unknown as { ensureStripeCustomer: (consumerId: string) => Promise<unknown> }
    ).ensureStripeCustomer(`consumer-1`);

    expect(customersCreate).toHaveBeenCalledWith(
      { email: `consumer@example.com` },
      { idempotencyKey: `ensure-customer:consumer-1` },
    );
    expect(customerAccessRepositoryForCustomer.claimStripeCustomerId).toHaveBeenCalledWith(`consumer-1`, `cus_new`);
  });

  it(`returns the already-claimed stripe customer id when another writer wins the claim race`, async () => {
    const customersCreate = jest.fn<(...a: any[]) => any>().mockResolvedValue({ id: `cus_new` });
    const customerAccessRepositoryForCustomer = {
      findConsumer: jest.fn<(...a: any[]) => any>().mockResolvedValue({
        id: `consumer-1`,
        email: `consumer@example.com`,
        stripeCustomerId: null,
      }),
      claimStripeCustomerId: jest.fn<(...a: any[]) => any>().mockResolvedValue(false),
      findStripeCustomerId: jest.fn<(...a: any[]) => any>().mockResolvedValue({ stripeCustomerId: `cus_existing` }),
    };
    const serviceForCustomer = new ConsumerStripeService(
      {
        customers: { create: customersCreate },
      } as any,
      customerAccessRepositoryForCustomer as unknown as StripeCustomerAccessRepository,
      {
        appendCheckoutWaitingOutcomes: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
        markSavedMethodPaymentCompleted: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
        appendDeniedSavedMethodPaymentOutcomes: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
      } as unknown as StripePaymentOutcomesRepository,
      {} as StripePaymentRequestAccessRepository,
      {} as StripeSavedPaymentMethodsRepository,
      {} as StripeSetupIntentPersistenceRepository,
    );

    await expect(
      (
        serviceForCustomer as unknown as { ensureStripeCustomer: (consumerId: string) => Promise<unknown> }
      ).ensureStripeCustomer(`consumer-1`),
    ).resolves.toEqual({
      consumer: expect.objectContaining({ id: `consumer-1` }),
      customerId: `cus_existing`,
    });

    expect(customersCreate).toHaveBeenCalledWith(
      { email: `consumer@example.com` },
      { idempotencyKey: `ensure-customer:consumer-1` },
    );
    expect(customerAccessRepositoryForCustomer.findStripeCustomerId).toHaveBeenCalledWith(`consumer-1`);
  });

  it(`delegates successful setup-intent persistence after Stripe validation`, async () => {
    const persistSetupIntentPaymentMethod = jest.fn<(...a: any[]) => any>().mockResolvedValue({ id: `local-pm-1` });
    const serviceForSetupIntent = new ConsumerStripeService(
      {
        setupIntents: {
          retrieve: jest.fn<(...a: any[]) => any>().mockResolvedValue({
            status: `succeeded`,
            payment_method: {
              id: `pm_1`,
              type: `card`,
              card: {
                brand: `visa`,
                last4: `4242`,
                exp_month: 12,
                exp_year: 2030,
                fingerprint: `fp_1`,
              },
              billing_details: {
                email: null,
                name: `Card User`,
                phone: null,
              },
            },
          }),
        },
      } as any,
      {} as StripeCustomerAccessRepository,
      {
        appendCheckoutWaitingOutcomes: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
        markSavedMethodPaymentCompleted: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
        appendDeniedSavedMethodPaymentOutcomes: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
      } as unknown as StripePaymentOutcomesRepository,
      new StripePaymentRequestAccessRepository(
        prisma as unknown as PrismaService,
        {} as StripePaymentRequestLedgerBootstrapRepository,
      ),
      new StripeSavedPaymentMethodsRepository(prisma as unknown as PrismaService),
      {
        persistSetupIntentPaymentMethod,
      } as unknown as StripeSetupIntentPersistenceRepository,
    );
    jest
      .spyOn(
        serviceForSetupIntent as unknown as { ensureStripeCustomer: (...args: unknown[]) => Promise<unknown> },
        `ensureStripeCustomer`,
      )
      .mockResolvedValue({ customerId: `cus_1`, consumer: { id: `consumer-1`, email: `consumer@example.com` } });

    await expect(
      serviceForSetupIntent.confirmStripeSetupIntent(`consumer-1`, { setupIntentId: `seti_1` }),
    ).resolves.toEqual({ id: `local-pm-1` });

    expect(persistSetupIntentPaymentMethod).toHaveBeenCalledWith({
      consumerId: `consumer-1`,
      consumerEmail: `consumer@example.com`,
      stripePaymentMethodId: `pm_1`,
      stripeFingerprint: `fp_1`,
      brand: `visa`,
      last4: `4242`,
      expMonth: 12,
      expYear: 2030,
      billingDetails: {
        email: null,
        name: `Card User`,
        phone: null,
      },
    });
  });

  it(`invalidates the saved method after a non-reusable attach failure`, async () => {
    const invalidateNonReusableSavedMethod = jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined);
    const serviceForSavedMethod = new ConsumerStripeService(
      {
        paymentMethods: {
          retrieve: jest.fn<(...a: any[]) => any>().mockResolvedValue({ customer: `cus_other` }),
          attach: jest.fn<(...a: any[]) => any>().mockRejectedValue({
            type: `invalid_request_error`,
            message: `This payment method was previously used without being attached to a Customer`,
          }),
        },
      } as any,
      {} as StripeCustomerAccessRepository,
      {
        appendCheckoutWaitingOutcomes: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
        markSavedMethodPaymentCompleted: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
        appendDeniedSavedMethodPaymentOutcomes: jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined),
      } as unknown as StripePaymentOutcomesRepository,
      new StripePaymentRequestAccessRepository(
        prisma as unknown as PrismaService,
        {} as StripePaymentRequestLedgerBootstrapRepository,
      ),
      {
        findActiveSavedPaymentMethod: jest.fn<(...a: any[]) => any>().mockResolvedValue({
          id: `payment-method-1`,
          stripePaymentMethodId: `pm_1`,
          billingDetails: null,
        }),
        invalidateNonReusableSavedMethod,
      } as unknown as StripeSavedPaymentMethodsRepository,
      new StripeSetupIntentPersistenceRepository(prisma as unknown as PrismaService),
    );
    jest
      .spyOn(
        serviceForSavedMethod as unknown as { ensureStripeCustomer: (...args: unknown[]) => Promise<unknown> },
        `ensureStripeCustomer`,
      )
      .mockResolvedValue({ customerId: `cus_1`, consumer: { id: `consumer-1` } });

    await expect(
      serviceForSavedMethod.payWithSavedPaymentMethod(
        `consumer-1`,
        `payment-request-1`,
        { paymentMethodId: `payment-method-1` },
        `key-attach`,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(invalidateNonReusableSavedMethod).toHaveBeenCalledWith(`payment-method-1`);
  });
});

describe(`StripePaymentOutcomesRepository`, () => {
  afterEach(() => {
    createOutcomeIdempotentMock.mockClear();
  });

  it(`appends checkout WAITING outcomes after stamping CARD rail`, async () => {
    const ledgerEntryFindMany = jest
      .fn<(...a: any[]) => any>()
      .mockResolvedValue([{ id: `ledger-1` }, { id: `ledger-2` }]);
    const prisma = {
      ledgerEntryModel: {
        findMany: ledgerEntryFindMany,
      },
    } as unknown as PrismaService;
    const repository = new StripePaymentOutcomesRepository(prisma, {} as StripePaymentRequestAccessRepository);

    await repository.appendCheckoutWaitingOutcomes({
      paymentRequestId: `payment-request-1`,
      checkoutSessionId: `cs_1`,
      logger: {} as any,
    });

    expect(ledgerEntryFindMany).toHaveBeenCalledWith({
      where: { paymentRequestId: `payment-request-1` },
      select: { id: true },
    });
    expect(createOutcomeIdempotentMock).toHaveBeenNthCalledWith(
      1,
      prisma,
      expect.objectContaining({
        ledgerEntryId: `ledger-1`,
        status: $Enums.TransactionStatus.WAITING,
        externalId: `cs_1`,
      }),
      expect.anything(),
    );
    expect(createOutcomeIdempotentMock).toHaveBeenNthCalledWith(
      2,
      prisma,
      expect.objectContaining({
        ledgerEntryId: `ledger-2`,
        status: $Enums.TransactionStatus.WAITING,
        externalId: `cs_1`,
      }),
      expect.anything(),
    );
  });

  it(`marks saved-method payment completed without duplicating completed outcomes`, async () => {
    const tx = {
      ledgerEntryModel: {
        findMany: jest.fn<(...a: any[]) => any>().mockResolvedValue([
          {
            id: `ledger-1`,
            status: $Enums.TransactionStatus.PENDING,
            outcomes: [],
          },
          {
            id: `ledger-2`,
            status: $Enums.TransactionStatus.PENDING,
            outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
          },
        ]),
      },
    };
    const markPaymentRequestCompletedForStripe = jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined);
    const repository = new StripePaymentOutcomesRepository(
      {
        $transaction: jest
          .fn<(...a: any[]) => any>()
          .mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      } as unknown as PrismaService,
      {
        markPaymentRequestCompletedForStripe,
      } as unknown as StripePaymentRequestAccessRepository,
    );

    await repository.markSavedMethodPaymentCompleted({
      paymentRequestId: `payment-request-1`,
      paymentIntentId: `pi_1`,
      logger: {} as any,
    });

    expect(createOutcomeIdempotentMock).toHaveBeenCalledTimes(1);
    expect(createOutcomeIdempotentMock).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        ledgerEntryId: `ledger-1`,
        status: $Enums.TransactionStatus.COMPLETED,
        externalId: `pi_1`,
      }),
      expect.anything(),
    );
    expect(markPaymentRequestCompletedForStripe).toHaveBeenCalledWith(tx, `payment-request-1`);
  });

  it(`does not stamp payment-request completion if outcome append fails inside the transaction`, async () => {
    const tx = {
      ledgerEntryModel: {
        findMany: jest.fn<(...a: any[]) => any>().mockResolvedValue([
          {
            id: `ledger-1`,
            status: $Enums.TransactionStatus.PENDING,
            outcomes: [],
          },
        ]),
      },
    };
    const markPaymentRequestCompletedForStripe = jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined);
    createOutcomeIdempotentMock.mockRejectedValueOnce(new Error(`boom`));
    const repository = new StripePaymentOutcomesRepository(
      {
        $transaction: jest
          .fn<(...a: any[]) => any>()
          .mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      } as unknown as PrismaService,
      {
        markPaymentRequestCompletedForStripe,
      } as unknown as StripePaymentRequestAccessRepository,
    );

    await expect(
      repository.markSavedMethodPaymentCompleted({
        paymentRequestId: `payment-request-1`,
        paymentIntentId: `pi_1`,
        logger: {} as any,
      }),
    ).rejects.toThrow(`boom`);

    expect(markPaymentRequestCompletedForStripe).not.toHaveBeenCalled();
  });

  it(`appends DENIED outcomes for all ledger entries on terminal decline`, async () => {
    const tx = {
      ledgerEntryModel: {
        findMany: jest.fn<(...a: any[]) => any>().mockResolvedValue([{ id: `ledger-1` }, { id: `ledger-2` }]),
      },
    };
    const repository = new StripePaymentOutcomesRepository(
      {
        $transaction: jest
          .fn<(...a: any[]) => any>()
          .mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      } as unknown as PrismaService,
      {} as StripePaymentRequestAccessRepository,
    );

    await repository.appendDeniedSavedMethodPaymentOutcomes({
      paymentRequestId: `payment-request-1`,
      logger: {} as any,
    });

    expect(createOutcomeIdempotentMock).toHaveBeenNthCalledWith(
      1,
      tx,
      expect.objectContaining({
        ledgerEntryId: `ledger-1`,
        status: $Enums.TransactionStatus.DENIED,
        externalId: `denied:stripe:pr:payment-request-1:entry:ledger-1`,
      }),
      expect.anything(),
    );
    expect(createOutcomeIdempotentMock).toHaveBeenNthCalledWith(
      2,
      tx,
      expect.objectContaining({
        ledgerEntryId: `ledger-2`,
        status: $Enums.TransactionStatus.DENIED,
        externalId: `denied:stripe:pr:payment-request-1:entry:ledger-2`,
      }),
      expect.anything(),
    );
  });
});

describe(`StripeCustomerAccessRepository`, () => {
  it(`loads the consumer used for stripe customer orchestration`, async () => {
    const findUnique = jest.fn<(...a: any[]) => any>().mockResolvedValue({ id: `consumer-1` });
    const repository = new StripeCustomerAccessRepository({
      consumerModel: {
        findUnique,
      },
    } as unknown as PrismaService);

    await expect(repository.findConsumer(`consumer-1`)).resolves.toEqual({ id: `consumer-1` });

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: `consumer-1` },
    });
  });

  it(`claims stripeCustomerId only when it is currently null`, async () => {
    const updateMany = jest
      .fn<(...a: any[]) => any>()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const repository = new StripeCustomerAccessRepository({
      consumerModel: {
        updateMany,
      },
    } as unknown as PrismaService);

    await expect(repository.claimStripeCustomerId(`consumer-1`, `cus_1`)).resolves.toBe(true);
    await expect(repository.claimStripeCustomerId(`consumer-1`, `cus_2`)).resolves.toBe(false);

    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: `consumer-1`, stripeCustomerId: null },
      data: { stripeCustomerId: `cus_1` },
    });
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: `consumer-1`, stripeCustomerId: null },
      data: { stripeCustomerId: `cus_2` },
    });
  });

  it(`rereads only stripeCustomerId for the race fallback path`, async () => {
    const findUnique = jest.fn<(...a: any[]) => any>().mockResolvedValue({ stripeCustomerId: `cus_existing` });
    const repository = new StripeCustomerAccessRepository({
      consumerModel: {
        findUnique,
      },
    } as unknown as PrismaService);

    await expect(repository.findStripeCustomerId(`consumer-1`)).resolves.toEqual({
      stripeCustomerId: `cus_existing`,
    });

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: `consumer-1` },
      select: { stripeCustomerId: true },
    });
  });
});

describe(`StripePaymentRequestAccessRepository`, () => {
  it(`claims payer access and returns the payment request after bootstrap delegation`, async () => {
    const txPaymentRequestUpdateMany = jest.fn<(...a: any[]) => any>().mockResolvedValue({ count: 1 });
    const bootstrapInitialLedgerEntries = jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined);
    const prisma = {
      consumerModel: {
        findUnique: jest.fn<(...a: any[]) => any>().mockResolvedValue({ email: `payer@example.com` }),
      },
      paymentRequestModel: {
        findUnique: jest.fn<(...a: any[]) => any>().mockResolvedValue({
          id: `payment-request-claim`,
          payerId: `consumer-1`,
          status: $Enums.TransactionStatus.PENDING,
          currencyCode: $Enums.CurrencyCode.USD,
          ledgerEntries: [],
          requester: { email: `requester@example.com` },
          requesterEmail: null,
        }),
      },
      $transaction: jest
        .fn<(...a: any[]) => any>()
        .mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
          callback({
            paymentRequestModel: {
              findUnique: jest.fn<(...a: any[]) => any>().mockResolvedValue({
                id: `payment-request-claim`,
                payerId: null,
                payerEmail: `payer@example.com`,
                requesterId: `requester-1`,
                amount: 25,
                currencyCode: $Enums.CurrencyCode.USD,
                status: $Enums.TransactionStatus.PENDING,
                ledgerEntries: [],
              }),
              updateMany: txPaymentRequestUpdateMany,
            },
          }),
        ),
    } as any;
    const repository = new StripePaymentRequestAccessRepository(prisma, {
      bootstrapInitialLedgerEntries,
    } as unknown as StripePaymentRequestLedgerBootstrapRepository);

    await expect(repository.getPaymentRequestForPayer(`consumer-1`, `payment-request-claim`)).resolves.toEqual(
      expect.objectContaining({
        id: `payment-request-claim`,
        payerId: `consumer-1`,
      }),
    );

    expect(bootstrapInitialLedgerEntries).toHaveBeenCalledWith({
      tx: expect.anything(),
      paymentRequest: expect.objectContaining({
        id: `payment-request-claim`,
        requesterId: `requester-1`,
        amount: 25,
        currencyCode: $Enums.CurrencyCode.USD,
      }),
      consumerId: `consumer-1`,
    });
  });

  it(`stamps late-selected card payments with CARD rail`, async () => {
    const paymentRequestUpdateMany = jest.fn<(...a: any[]) => any>().mockResolvedValue({ count: 1 });
    const repository = new StripePaymentRequestAccessRepository(
      {} as PrismaService,
      {} as StripePaymentRequestLedgerBootstrapRepository,
    );

    await repository.ensureCardPaymentRail(
      { paymentRequestModel: { updateMany: paymentRequestUpdateMany } } as any,
      `payment-request-1`,
      `consumer-1`,
    );

    expect(paymentRequestUpdateMany).toHaveBeenCalledWith({
      where: { id: `payment-request-1`, paymentRail: null },
      data: {
        paymentRail: $Enums.PaymentRail.CARD,
        updatedBy: `consumer-1`,
      },
    });
  });

  it(`marks the payment request completed for stripe once outcomes are appended`, async () => {
    const paymentRequestUpdateMany = jest.fn<(...a: any[]) => any>().mockResolvedValue({ count: 1 });
    const repository = new StripePaymentRequestAccessRepository(
      {
        paymentRequestModel: {
          updateMany: paymentRequestUpdateMany,
        },
      } as unknown as PrismaService,
      {} as StripePaymentRequestLedgerBootstrapRepository,
    );

    await repository.markPaymentRequestCompletedForStripeRequest(`payment-request-1`);

    expect(paymentRequestUpdateMany).toHaveBeenCalledWith({
      where: {
        id: `payment-request-1`,
        OR: [{ status: { not: $Enums.TransactionStatus.COMPLETED } }, { paymentRail: null }],
      },
      data: {
        status: $Enums.TransactionStatus.COMPLETED,
        paymentRail: $Enums.PaymentRail.CARD,
        updatedBy: `stripe`,
      },
    });
  });
});

describe(`StripePaymentRequestLedgerBootstrapRepository`, () => {
  it(`materializes payer and requester ledger rows for a claimed payment request`, async () => {
    const create = jest.fn<(...a: any[]) => any>().mockResolvedValue(undefined);
    const repository = new StripePaymentRequestLedgerBootstrapRepository();

    await repository.bootstrapInitialLedgerEntries({
      tx: {
        ledgerEntryModel: {
          create,
        },
      } as any,
      paymentRequest: {
        id: `payment-request-claim`,
        requesterId: `requester-1`,
        amount: 25,
        currencyCode: $Enums.CurrencyCode.USD,
      },
      consumerId: `consumer-1`,
    });

    expect(create).toHaveBeenCalledTimes(2);
    const payerArg = create.mock.calls[0]?.[0] as {
      data: { consumerId: string; paymentRequestId: string; type: $Enums.LedgerEntryType; amount: Prisma.Decimal };
    };
    const requesterArg = create.mock.calls[1]?.[0] as {
      data: { consumerId: string; paymentRequestId: string; type: $Enums.LedgerEntryType; amount: Prisma.Decimal };
    };
    expect(payerArg.data).toMatchObject({
      consumerId: `consumer-1`,
      paymentRequestId: `payment-request-claim`,
      type: $Enums.LedgerEntryType.USER_PAYMENT,
    });
    expect(payerArg.data.amount.toString()).toBe(`-25`);
    expect(requesterArg.data).toMatchObject({
      consumerId: `requester-1`,
      paymentRequestId: `payment-request-claim`,
      type: $Enums.LedgerEntryType.USER_DEPOSIT,
    });
    expect(requesterArg.data.amount.toString()).toBe(`25`);
    // reconciliation invariant: debits + credits = 0
    expect(payerArg.data.amount.plus(requesterArg.data.amount).toString()).toBe(`0`);
  });

  it(`swallows duplicate-safe P2002 races during bootstrap`, async () => {
    const duplicateError = Object.assign(Object.create(Prisma.PrismaClientKnownRequestError.prototype), {
      code: `P2002`,
    });
    const create = jest.fn<(...a: any[]) => any>().mockRejectedValue(duplicateError);
    const repository = new StripePaymentRequestLedgerBootstrapRepository();

    await expect(
      repository.bootstrapInitialLedgerEntries({
        tx: {
          ledgerEntryModel: {
            create,
          },
        } as any,
        paymentRequest: {
          id: `payment-request-claim`,
          requesterId: `requester-1`,
          amount: 25,
          currencyCode: $Enums.CurrencyCode.USD,
        },
        consumerId: `consumer-1`,
      }),
    ).resolves.toBeUndefined();

    expect(create).toHaveBeenCalledTimes(2);
  });
});

describe(`StripeSetupIntentPersistenceRepository`, () => {
  it(`falls back billing email to the consumer email and maps card fields`, async () => {
    const billingDetailsCreate = jest.fn<(...a: any[]) => any>().mockResolvedValue({ id: `billing-1` });
    const paymentMethodCount = jest.fn<(...a: any[]) => any>().mockResolvedValue(0);
    const paymentMethodCreate = jest.fn<(...a: any[]) => any>().mockResolvedValue({ id: `pm-local-1` });
    const repository = new StripeSetupIntentPersistenceRepository({
      billingDetailsModel: {
        create: billingDetailsCreate,
      },
      paymentMethodModel: {
        count: paymentMethodCount,
        create: paymentMethodCreate,
      },
    } as unknown as PrismaService);

    await expect(
      repository.persistSetupIntentPaymentMethod({
        consumerId: `consumer-1`,
        consumerEmail: `consumer@example.com`,
        stripePaymentMethodId: `pm_1`,
        stripeFingerprint: `fp_1`,
        brand: `visa`,
        last4: `4242`,
        expMonth: 12,
        expYear: 2030,
        billingDetails: {
          email: null,
          name: `Card User`,
          phone: null,
        },
      }),
    ).resolves.toEqual({ id: `pm-local-1` });

    expect(billingDetailsCreate).toHaveBeenCalledWith({
      data: {
        email: `consumer@example.com`,
        name: `Card User`,
        phone: null,
      },
    });
    expect(paymentMethodCreate).toHaveBeenCalledWith({
      data: {
        type: $Enums.PaymentMethodType.CREDIT_CARD,
        stripePaymentMethodId: `pm_1`,
        stripeFingerprint: `fp_1`,
        defaultSelected: true,
        brand: `visa`,
        last4: `4242`,
        serviceFee: 0,
        expMonth: `12`,
        expYear: `2030`,
        billingDetailsId: `billing-1`,
        consumerId: `consumer-1`,
      },
    });
  });

  it(`does not mark the new card as default when an active default already exists`, async () => {
    const paymentMethodCreate = jest.fn<(...a: any[]) => any>().mockResolvedValue({ id: `pm-local-2` });
    const repository = new StripeSetupIntentPersistenceRepository({
      billingDetailsModel: {
        create: jest.fn<(...a: any[]) => any>().mockResolvedValue({ id: `billing-2` }),
      },
      paymentMethodModel: {
        count: jest.fn<(...a: any[]) => any>().mockResolvedValue(1),
        create: paymentMethodCreate,
      },
    } as unknown as PrismaService);

    await repository.persistSetupIntentPaymentMethod({
      consumerId: `consumer-2`,
      consumerEmail: `consumer-2@example.com`,
      stripePaymentMethodId: `pm_2`,
      stripeFingerprint: null,
      brand: `mastercard`,
      last4: `4444`,
      expMonth: 1,
      expYear: 2031,
      billingDetails: {},
    });

    expect(paymentMethodCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          defaultSelected: false,
          stripeFingerprint: null,
        }),
      }),
    );
  });
});

describe(`StripeSavedPaymentMethodsRepository`, () => {
  it(`looks up only active saved methods for the owning consumer`, async () => {
    const findFirst = jest.fn<(...a: any[]) => any>().mockResolvedValue({ id: `payment-method-1` });
    const repository = new StripeSavedPaymentMethodsRepository({
      paymentMethodModel: {
        findFirst,
      },
    } as unknown as PrismaService);

    await expect(repository.findActiveSavedPaymentMethod(`consumer-1`, `payment-method-1`)).resolves.toEqual({
      id: `payment-method-1`,
    });

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: `payment-method-1`,
        consumerId: `consumer-1`,
        deletedAt: null,
      },
      include: { billingDetails: true },
    });
  });

  it(`invalidates non-reusable saved methods by soft-deleting and clearing stripe id`, async () => {
    const update = jest.fn<(...a: any[]) => any>().mockResolvedValue({ id: `payment-method-1` });
    const repository = new StripeSavedPaymentMethodsRepository({
      paymentMethodModel: {
        update,
      },
    } as unknown as PrismaService);

    await repository.invalidateNonReusableSavedMethod(`payment-method-1`);

    expect(update).toHaveBeenCalledWith({
      where: { id: `payment-method-1` },
      data: {
        deletedAt: expect.any(Date),
        stripePaymentMethodId: null,
      },
    });
  });
});
