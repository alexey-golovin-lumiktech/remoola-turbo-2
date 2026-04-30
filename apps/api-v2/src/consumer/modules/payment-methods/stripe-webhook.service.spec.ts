import { type default as express } from 'express';
import Stripe from 'stripe';

import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';

import { createOutcomeIdempotent } from './ledger-outcome-idempotent';
import { StripeWebhookPaymentMethodsService } from './stripe-webhook-payment-methods.service';
import { StripeWebhookPayoutsService } from './stripe-webhook-payouts.service';
import { StripeWebhookReversalsService } from './stripe-webhook-reversals.service';
import { StripeWebhookSettlementsService } from './stripe-webhook-settlements.service';
import { StripeWebhookVerificationService } from './stripe-webhook-verification.service';
import { StripeWebhookService as StripeWebhookServiceClass } from './stripe-webhook.service';
import { envs } from '../../../envs';
import { BalanceCalculationMode } from '../../../shared/balance-calculation.service';
import { STRIPE_IDENTITY_STATUS } from '../../../shared-common';

class StripeWebhookService extends StripeWebhookServiceClass {
  constructor(prisma: any, mailingService: any, balanceService: any, consumerPaymentsPoliciesService: any) {
    let stripe: any = new Stripe(envs.STRIPE_SECRET_KEY, { apiVersion: `2025-11-17.clover` });
    const paymentMethodsService = new StripeWebhookPaymentMethodsService(prisma, stripe);
    const payoutsService = new StripeWebhookPayoutsService(prisma);
    const settlementsService = new StripeWebhookSettlementsService(prisma);
    const verificationService = new StripeWebhookVerificationService(prisma, consumerPaymentsPoliciesService, stripe);
    const reversalsService = new StripeWebhookReversalsService(prisma, mailingService, balanceService, stripe);

    super(
      prisma,
      stripe,
      paymentMethodsService,
      payoutsService,
      settlementsService,
      verificationService,
      reversalsService,
    );

    const logger = (this as any).logger;
    (paymentMethodsService as any).logger = logger;
    (payoutsService as any).logger = logger;
    (settlementsService as any).logger = logger;
    (verificationService as any).logger = logger;
    (reversalsService as any).logger = logger;

    Object.defineProperty(this, `stripe`, {
      configurable: true,
      enumerable: true,
      get: () => stripe,
      set: (value) => {
        stripe = value;
        (paymentMethodsService as any).stripe = value;
        (verificationService as any).stripe = value;
        (reversalsService as any).stripe = value;
      },
    });
  }
}

jest.mock(`../../../envs`, () => ({
  envs: {
    STRIPE_WEBHOOK_SECRET: ``,
    STRIPE_SECRET_KEY: `sk_test_mock`,
  },
}));
jest.mock(`./ledger-outcome-idempotent`, () => ({
  createOutcomeIdempotent: jest.fn().mockResolvedValue(undefined),
}));

describe(`StripeWebhookService.processStripeEvent`, () => {
  function makeService() {
    // Partial mocks for deps; only processStripeEvent and env check are under test.
    const prisma = {} as any;
    const mailingService = {} as any;
    const balanceService = {} as any;
    const consumerPaymentsService = {} as any;
    return new StripeWebhookService(prisma, mailingService, balanceService, consumerPaymentsService);
  }

  it(`returns 401 when webhook secret is not configured (missing or placeholder)`, async () => {
    const service = makeService();
    const req = { rawBody: Buffer.from(`{}`), headers: {} } as any; // partial request for 401 path only
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as express.Response;

    await service.processStripeEvent(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      received: false,
      error: `Webhook secret not configured`,
    });
  });

  it(`logs sanitized warning and returns 400 when signature verification fails`, async () => {
    const service = makeService();
    const loggerWarn = jest
      .spyOn((service as unknown as { logger: { warn: (...args: unknown[]) => void } }).logger, `warn`)
      .mockImplementation(() => undefined);
    const req = {
      rawBody: Buffer.from(`{}`),
      headers: { 'stripe-signature': `sig_test` },
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as express.Response;

    const envModule = jest.requireMock(`../../../envs`) as {
      envs: { STRIPE_WEBHOOK_SECRET: string };
    };
    envModule.envs.STRIPE_WEBHOOK_SECRET = `whsec_test`;
    (
      service as unknown as {
        stripe: { webhooks: { constructEvent: (...args: unknown[]) => unknown } };
      }
    ).stripe = {
      webhooks: {
        constructEvent: jest.fn(() => {
          throw new Error(`invalid signature`);
        }),
      },
    };

    await service.processStripeEvent(req, res);

    expect(loggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: `stripe_webhook_processing_failed`,
        stage: `signature_verification_failed`,
        errorClass: `Error`,
        errorMessage: `invalid signature`,
        hasRawBody: true,
        hasSignatureHeader: true,
      }),
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      received: false,
      error: `Webhook processing failed`,
    });
  });

  it(`logs managed verification processing failures with event context and returns 500`, async () => {
    const stripeWebhookEventCreate = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      stripeWebhookEventModel: { create: stripeWebhookEventCreate },
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          stripeWebhookEventModel: { create: stripeWebhookEventCreate },
          consumerModel: {},
        }),
      ),
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);
    const loggerWarn = jest
      .spyOn((service as unknown as { logger: { warn: (...args: unknown[]) => void } }).logger, `warn`)
      .mockImplementation(() => undefined);
    const mockEvent = {
      id: `evt_verify_failure`,
      type: `identity.verification_session.verified`,
      data: { object: { id: `vs_failure`, metadata: { consumerId: `00000000-0000-4000-8000-000000000001` } } },
    };
    (
      service as unknown as {
        stripe: { webhooks: { constructEvent: (...args: unknown[]) => unknown } };
      }
    ).stripe = {
      webhooks: {
        constructEvent: jest.fn().mockReturnValue(mockEvent),
      },
    };
    jest
      .spyOn(service as any, `handleVerified`)
      .mockRejectedValue(new Error(`column "stripe_identity_status" does not exist`));

    const envModule = jest.requireMock(`../../../envs`) as {
      envs: { STRIPE_WEBHOOK_SECRET: string };
    };
    envModule.envs.STRIPE_WEBHOOK_SECRET = `whsec_test`;

    const req = {
      rawBody: Buffer.from(JSON.stringify(mockEvent)),
      headers: { 'stripe-signature': `sig_test` },
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as express.Response;

    await service.processStripeEvent(req, res);

    expect(loggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: `stripe_webhook_processing_failed`,
        stage: `managed_verification_processing_failed`,
        eventId: `evt_verify_failure`,
        eventType: `identity.verification_session.verified`,
        errorClass: `Error`,
        errorMessage: `column "stripe_identity_status" does not exist`,
        hasRawBody: true,
        hasSignatureHeader: true,
      }),
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      received: false,
      error: `Webhook processing failed`,
    });
  });

  it(`uses raw request body from req.body when req.rawBody is unavailable`, async () => {
    const service = makeService();
    const mockEvent = {
      id: `evt_body_buffer`,
      type: `identity.verification_session.verified`,
      data: { object: { id: `vs_body_buffer`, metadata: { consumerId: `00000000-0000-4000-8000-000000000001` } } },
    };
    const constructEvent = jest.fn().mockReturnValue(mockEvent);
    (
      service as unknown as {
        stripe: { webhooks: { constructEvent: (...args: unknown[]) => unknown } };
      }
    ).stripe = {
      webhooks: {
        constructEvent,
      },
    };
    (service as any).processManagedVerificationEvent = jest.fn().mockResolvedValue(undefined);

    const envModule = jest.requireMock(`../../../envs`) as {
      envs: { STRIPE_WEBHOOK_SECRET: string };
    };
    envModule.envs.STRIPE_WEBHOOK_SECRET = `whsec_test`;

    const req = {
      body: Buffer.from(JSON.stringify(mockEvent)),
      headers: { 'stripe-signature': `sig_test` },
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as express.Response;

    await service.processStripeEvent(req, res);

    expect(constructEvent).toHaveBeenCalledWith(req.body, `sig_test`, `whsec_test`);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it(`returns 200 when the processed-event marker already exists after an idempotent rerun`, async () => {
    const stripeWebhookEventCreate = jest
      .fn()
      .mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(`Unique constraint`, { code: `P2002`, clientVersion: `6.x` }),
      );
    const prisma = {
      stripeWebhookEventModel: { create: stripeWebhookEventCreate },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);
    const finalizeCheckoutSessionSuccess = jest
      .spyOn(service as any, `finalizeCheckoutSessionSuccess`)
      .mockResolvedValue(undefined);

    const mockEvent = {
      id: `evt_dup`,
      type: `checkout.session.completed`,
      data: { object: { id: `cs_test`, mode: `payment` } },
    };
    (
      service as unknown as {
        stripe: { webhooks: { constructEvent: (...args: unknown[]) => unknown } };
      }
    ).stripe = {
      webhooks: {
        constructEvent: jest.fn().mockReturnValue(mockEvent),
      },
    };

    const envModule = jest.requireMock(`../../../envs`) as { envs: { STRIPE_WEBHOOK_SECRET: string } };
    envModule.envs.STRIPE_WEBHOOK_SECRET = `whsec_test`;

    const req = {
      rawBody: Buffer.from(JSON.stringify(mockEvent)),
      headers: { 'stripe-signature': `sig_test` },
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as express.Response;

    await service.processStripeEvent(req, res);

    expect(finalizeCheckoutSessionSuccess).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ received: true });
    expect(res.status).not.toHaveBeenCalled();
    expect(createOutcomeIdempotent).not.toHaveBeenCalled();
  });

  it(`does not record the dedupe marker when a non-identity handler fails before completion`, async () => {
    const stripeWebhookEventCreate = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      stripeWebhookEventModel: { create: stripeWebhookEventCreate },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);
    const finalizeCheckoutSessionSuccess = jest
      .spyOn(service as any, `finalizeCheckoutSessionSuccess`)
      .mockRejectedValueOnce(new Error(`temporary failure`))
      .mockResolvedValueOnce(undefined);

    const mockEvent = {
      id: `evt_retryable`,
      type: `checkout.session.completed`,
      data: { object: { id: `cs_retry`, mode: `payment` } },
    };
    (
      service as unknown as {
        stripe: { webhooks: { constructEvent: (...args: unknown[]) => unknown } };
      }
    ).stripe = {
      webhooks: {
        constructEvent: jest.fn().mockReturnValue(mockEvent),
      },
    };

    const envModule = jest.requireMock(`../../../envs`) as { envs: { STRIPE_WEBHOOK_SECRET: string } };
    envModule.envs.STRIPE_WEBHOOK_SECRET = `whsec_test`;

    const firstReq = {
      rawBody: Buffer.from(JSON.stringify(mockEvent)),
      headers: { 'stripe-signature': `sig_test` },
    } as any;
    const firstRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as express.Response;

    await service.processStripeEvent(firstReq, firstRes);

    expect(firstRes.status).toHaveBeenCalledWith(500);
    expect(stripeWebhookEventCreate).not.toHaveBeenCalled();

    const secondReq = {
      rawBody: Buffer.from(JSON.stringify(mockEvent)),
      headers: { 'stripe-signature': `sig_test` },
    } as any;
    const secondRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as express.Response;

    await service.processStripeEvent(secondReq, secondRes);

    expect(finalizeCheckoutSessionSuccess).toHaveBeenCalledTimes(2);
    expect(stripeWebhookEventCreate).toHaveBeenCalledTimes(1);
    expect(secondRes.json).toHaveBeenCalledWith({ received: true });
  });

  it(`dispatches charge.refunded events to handleChargeRefunded`, async () => {
    const stripeWebhookEventCreate = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      stripeWebhookEventModel: { create: stripeWebhookEventCreate },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);
    const handleChargeRefunded = jest.spyOn(service as any, `handleChargeRefunded`).mockResolvedValue(undefined);

    const mockEvent = {
      id: `evt_charge_refunded`,
      type: `charge.refunded`,
      request: { idempotency_key: `refund-key-1` },
      data: { object: { id: `ch_1` } },
    };
    (
      service as unknown as {
        stripe: { webhooks: { constructEvent: (...args: unknown[]) => unknown } };
      }
    ).stripe = {
      webhooks: {
        constructEvent: jest.fn().mockReturnValue(mockEvent),
      },
    };

    const envModule = jest.requireMock(`../../../envs`) as { envs: { STRIPE_WEBHOOK_SECRET: string } };
    envModule.envs.STRIPE_WEBHOOK_SECRET = `whsec_test`;

    const req = {
      rawBody: Buffer.from(JSON.stringify(mockEvent)),
      headers: { 'stripe-signature': `sig_test` },
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as express.Response;

    await service.processStripeEvent(req, res);

    expect(handleChargeRefunded).toHaveBeenCalledTimes(1);
    expect(handleChargeRefunded).toHaveBeenCalledWith(mockEvent.data.object);
    expect(stripeWebhookEventCreate).toHaveBeenCalledWith({ data: { eventId: `evt_charge_refunded` } });
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it(`dispatches charge.refund.updated events to handleRefundUpdated`, async () => {
    const stripeWebhookEventCreate = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      stripeWebhookEventModel: { create: stripeWebhookEventCreate },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);
    const handleRefundUpdated = jest.spyOn(service as any, `handleRefundUpdated`).mockResolvedValue(undefined);

    const mockEvent = {
      id: `evt_refund_updated`,
      type: `charge.refund.updated`,
      request: { idempotency_key: `refund-key-2` },
      data: { object: { id: `re_1`, status: `pending` } },
    };
    (
      service as unknown as {
        stripe: { webhooks: { constructEvent: (...args: unknown[]) => unknown } };
      }
    ).stripe = {
      webhooks: {
        constructEvent: jest.fn().mockReturnValue(mockEvent),
      },
    };

    const envModule = jest.requireMock(`../../../envs`) as { envs: { STRIPE_WEBHOOK_SECRET: string } };
    envModule.envs.STRIPE_WEBHOOK_SECRET = `whsec_test`;

    const req = {
      rawBody: Buffer.from(JSON.stringify(mockEvent)),
      headers: { 'stripe-signature': `sig_test` },
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as express.Response;

    await service.processStripeEvent(req, res);

    expect(handleRefundUpdated).toHaveBeenCalledTimes(1);
    expect(handleRefundUpdated).toHaveBeenCalledWith(mockEvent.data.object);
    expect(stripeWebhookEventCreate).toHaveBeenCalledWith({ data: { eventId: `evt_refund_updated` } });
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it(`dispatches charge.dispute.created events to handleChargeDispute`, async () => {
    const stripeWebhookEventCreate = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      stripeWebhookEventModel: { create: stripeWebhookEventCreate },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);
    const handleChargeDispute = jest.spyOn(service as any, `handleChargeDispute`).mockResolvedValue(undefined);

    const mockEvent = {
      id: `evt_dispute_created`,
      type: `charge.dispute.created`,
      request: { idempotency_key: `dispute-key-1` },
      data: { object: { id: `dp_1`, payment_intent: `pi_1` } },
    };
    (
      service as unknown as {
        stripe: { webhooks: { constructEvent: (...args: unknown[]) => unknown } };
      }
    ).stripe = {
      webhooks: {
        constructEvent: jest.fn().mockReturnValue(mockEvent),
      },
    };

    const envModule = jest.requireMock(`../../../envs`) as { envs: { STRIPE_WEBHOOK_SECRET: string } };
    envModule.envs.STRIPE_WEBHOOK_SECRET = `whsec_test`;

    const req = {
      rawBody: Buffer.from(JSON.stringify(mockEvent)),
      headers: { 'stripe-signature': `sig_test` },
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as express.Response;

    await service.processStripeEvent(req, res);

    expect(handleChargeDispute).toHaveBeenCalledTimes(1);
    expect(handleChargeDispute).toHaveBeenCalledWith(mockEvent.data.object);
    expect(stripeWebhookEventCreate).toHaveBeenCalledWith({ data: { eventId: `evt_dispute_created` } });
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  const duplicateRefundUpdatedEventDescription =
    `returns success for duplicate refund.updated event after handler completes ` + `and marker already exists`;

  it(duplicateRefundUpdatedEventDescription, async () => {
    const stripeWebhookEventCreate = jest
      .fn()
      .mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(`Unique constraint`, { code: `P2002`, clientVersion: `6.x` }),
      );
    const prisma = {
      stripeWebhookEventModel: { create: stripeWebhookEventCreate },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);
    const handleRefundUpdated = jest.spyOn(service as any, `handleRefundUpdated`).mockResolvedValue(undefined);

    const mockEvent = {
      id: `evt_refund_updated_duplicate`,
      type: `charge.refund.updated`,
      request: { idempotency_key: `refund-key-3` },
      data: { object: { id: `re_dup`, status: `succeeded` } },
    };
    (
      service as unknown as {
        stripe: { webhooks: { constructEvent: (...args: unknown[]) => unknown } };
      }
    ).stripe = {
      webhooks: {
        constructEvent: jest.fn().mockReturnValue(mockEvent),
      },
    };

    const envModule = jest.requireMock(`../../../envs`) as { envs: { STRIPE_WEBHOOK_SECRET: string } };
    envModule.envs.STRIPE_WEBHOOK_SECRET = `whsec_test`;

    const req = {
      rawBody: Buffer.from(JSON.stringify(mockEvent)),
      headers: { 'stripe-signature': `sig_test` },
    } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as express.Response;

    await service.processStripeEvent(req, res);

    expect(handleRefundUpdated).toHaveBeenCalledTimes(1);
    expect(stripeWebhookEventCreate).toHaveBeenCalledWith({ data: { eventId: `evt_refund_updated_duplicate` } });
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });
});

describe(`StripeWebhookService payment link scope`, () => {
  it(`routes reversal emails with the stored consumer app scope`, async () => {
    const prisma = {
      ledgerEntryModel: {
        findMany: jest.fn().mockResolvedValue([{ metadata: { consumerAppScope: CURRENT_CONSUMER_APP_SCOPE } }]),
      },
      consumerModel: {
        findMany: jest.fn().mockResolvedValue([
          { id: `payer-1`, email: `payer@example.com` },
          { id: `requester-1`, email: `requester@example.com` },
        ]),
      },
    } as any;
    const mailingService = {
      sendPaymentRefundEmail: jest.fn().mockResolvedValue(undefined),
      sendPaymentChargebackEmail: jest.fn().mockResolvedValue(undefined),
    } as any;
    const service = new StripeWebhookService(prisma, mailingService, {} as any, {} as any);

    await (service as any).sendReversalEmails({
      paymentRequestId: `pr-1`,
      payerId: `payer-1`,
      requesterId: `requester-1`,
      requesterEmail: `requester@example.com`,
      amount: 5,
      currencyCode: $Enums.CurrencyCode.USD,
      kind: `CHARGEBACK`,
      reason: `stripe-reversal`,
    });

    expect(prisma.ledgerEntryModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          paymentRequestId: `pr-1`,
        }),
      }),
    );
    expect(mailingService.sendPaymentChargebackEmail).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        recipientEmail: `payer@example.com`,
        consumerAppScope: CURRENT_CONSUMER_APP_SCOPE,
      }),
    );
    expect(mailingService.sendPaymentChargebackEmail).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        recipientEmail: `requester@example.com`,
        consumerAppScope: CURRENT_CONSUMER_APP_SCOPE,
      }),
    );
  });

  it(`does not remap legacy payment-link metadata to the canonical consumer app scope`, async () => {
    const prisma = {
      ledgerEntryModel: {
        findMany: jest.fn().mockResolvedValue([{ metadata: { consumerAppScope: `consumer` } }]),
      },
      consumerModel: {
        findMany: jest.fn().mockResolvedValue([
          { id: `payer-1`, email: `payer@example.com` },
          { id: `requester-1`, email: `requester@example.com` },
        ]),
      },
    } as any;
    const mailingService = {
      sendPaymentRefundEmail: jest.fn().mockResolvedValue(undefined),
      sendPaymentChargebackEmail: jest.fn().mockResolvedValue(undefined),
    } as any;
    const service = new StripeWebhookService(prisma, mailingService, {} as any, {} as any);

    await (service as any).sendReversalEmails({
      paymentRequestId: `pr-1`,
      payerId: `payer-1`,
      requesterId: `requester-1`,
      requesterEmail: `requester@example.com`,
      amount: 5,
      currencyCode: $Enums.CurrencyCode.USD,
      kind: `CHARGEBACK`,
      reason: `stripe-reversal`,
    });

    expect(mailingService.sendPaymentChargebackEmail).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        recipientEmail: `payer@example.com`,
        consumerAppScope: undefined,
      }),
    );
    expect(mailingService.sendPaymentChargebackEmail).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        recipientEmail: `requester@example.com`,
        consumerAppScope: undefined,
      }),
    );
  });

  it(`keeps scanning ledger history until a later batch yields the stored consumer app scope`, async () => {
    const createdAt = new Date(`2026-01-01T00:00:00.000Z`);
    const prisma = {
      ledgerEntryModel: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce(
            Array.from({ length: 100 }, (_, index) => ({
              id: String(1000 - index).padStart(4, `0`),
              createdAt,
              metadata: {},
            })),
          )
          .mockResolvedValueOnce([{ metadata: { consumerAppScope: CURRENT_CONSUMER_APP_SCOPE } }]),
      },
      consumerModel: {
        findMany: jest.fn().mockResolvedValue([
          { id: `payer-1`, email: `payer@example.com` },
          { id: `requester-1`, email: `requester@example.com` },
        ]),
      },
    } as any;
    const mailingService = {
      sendPaymentRefundEmail: jest.fn().mockResolvedValue(undefined),
      sendPaymentChargebackEmail: jest.fn().mockResolvedValue(undefined),
    } as any;
    const service = new StripeWebhookService(prisma, mailingService, {} as any, {} as any);

    await (service as any).sendReversalEmails({
      paymentRequestId: `pr-1`,
      payerId: `payer-1`,
      requesterId: `requester-1`,
      requesterEmail: `requester@example.com`,
      amount: 5,
      currencyCode: $Enums.CurrencyCode.USD,
      kind: `CHARGEBACK`,
      reason: `stripe-reversal`,
    });

    expect(prisma.ledgerEntryModel.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        take: 100,
        where: expect.objectContaining({
          paymentRequestId: `pr-1`,
          deletedAt: null,
        }),
      }),
    );
    expect(prisma.ledgerEntryModel.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        take: 100,
        where: expect.objectContaining({
          paymentRequestId: `pr-1`,
          deletedAt: null,
          OR: [
            { createdAt: { lt: createdAt } },
            {
              createdAt,
              id: { lt: `0901` },
            },
          ],
        }),
      }),
    );
    expect(mailingService.sendPaymentChargebackEmail).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        recipientEmail: `payer@example.com`,
        consumerAppScope: CURRENT_CONSUMER_APP_SCOPE,
      }),
    );
    expect(mailingService.sendPaymentChargebackEmail).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        recipientEmail: `requester@example.com`,
        consumerAppScope: CURRENT_CONSUMER_APP_SCOPE,
      }),
    );
  });
});

describe(`StripeWebhookService.recordDisputeStatus`, () => {
  function makeService(prismaOverrides: Record<string, unknown>) {
    const prisma = {
      ledgerEntryModel: { findFirst: jest.fn().mockResolvedValue(null) },
      ledgerEntryOutcomeModel: { findFirst: jest.fn().mockResolvedValue(null) },
      ledgerEntryDisputeModel: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: `dispute-row` }),
      },
      $executeRaw: jest.fn().mockResolvedValue(undefined),
      $transaction: jest
        .fn()
        .mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma)),
      ...prismaOverrides,
    } as any;
    const mailingService = {} as any;
    const balanceService = {} as any;
    const consumerPaymentsService = {} as any;
    return {
      service: new StripeWebhookService(prisma, mailingService, balanceService, consumerPaymentsService),
      prisma,
    };
  }

  it(`skips dispute create when same dispute already exists for ledger entry`, async () => {
    const { service, prisma } = makeService({
      ledgerEntryModel: { findFirst: jest.fn().mockResolvedValue({ id: `ledger-1` }) },
      ledgerEntryDisputeModel: {
        findFirst: jest.fn().mockResolvedValue({ id: `existing-dispute` }),
        create: jest.fn(),
      },
    });
    const dispute = { id: `dp_1`, status: `won`, amount: 1200, reason: `fraudulent` } as any;

    await (service as any).recordDisputeStatus({ paymentIntentId: `pi_1`, dispute });

    expect(prisma.ledgerEntryDisputeModel.findFirst).toHaveBeenCalledWith({
      where: { ledgerEntryId: `ledger-1`, stripeDisputeId: `dp_1` },
      select: { id: true },
    });
    expect(prisma.ledgerEntryDisputeModel.create).not.toHaveBeenCalled();
  });

  it(`creates dispute when missing for resolved ledger entry`, async () => {
    const { service, prisma } = makeService({
      ledgerEntryModel: { findFirst: jest.fn().mockResolvedValue({ id: `ledger-1` }) },
    });
    const dispute = { id: `dp_1`, status: `needs_response`, amount: 1200, reason: `fraudulent` } as any;

    await (service as any).recordDisputeStatus({ paymentIntentId: `pi_1`, dispute });

    expect(prisma.ledgerEntryDisputeModel.create).toHaveBeenCalledWith({
      data: {
        ledgerEntryId: `ledger-1`,
        stripeDisputeId: `dp_1`,
        metadata: expect.objectContaining({
          status: `needs_response`,
          amount: 1200,
          reason: `fraudulent`,
          updatedAt: expect.any(String),
        }),
      },
    });
  });

  it(`treats dispute duplicate create as idempotent when db unique is hit`, async () => {
    const { service } = makeService({
      ledgerEntryModel: { findFirst: jest.fn().mockResolvedValue({ id: `ledger-1` }) },
      ledgerEntryDisputeModel: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError(`Unique constraint`, {
            code: `P2002`,
            clientVersion: `6.x`,
          }),
        ),
      },
    });
    const dispute = { id: `dp_1`, status: `needs_response`, amount: 1200, reason: `fraudulent` } as any;

    await expect((service as any).recordDisputeStatus({ paymentIntentId: `pi_1`, dispute })).resolves.toBeUndefined();
  });
});

describe(`StripeWebhookService.finalizeCheckoutSessionSuccess`, () => {
  it(`stamps completed payment requests with CARD rail without mutating settlement rows`, async () => {
    const paymentRequestUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          ledgerEntryModel: {
            findMany: jest.fn().mockResolvedValue([
              {
                id: `ledger-1`,
                type: $Enums.LedgerEntryType.USER_PAYMENT,
                status: $Enums.TransactionStatus.PENDING,
                outcomes: [{ status: $Enums.TransactionStatus.WAITING }],
              },
              {
                id: `ledger-2`,
                type: $Enums.LedgerEntryType.USER_DEPOSIT,
                status: $Enums.TransactionStatus.PENDING,
                outcomes: [],
              },
            ]),
          },
          paymentRequestModel: {
            findUnique: jest.fn().mockResolvedValue({
              amount: 25,
              currencyCode: $Enums.CurrencyCode.USD,
              payerId: `consumer-1`,
              payer: { stripeCustomerId: `cus_1` },
            }),
            updateMany: paymentRequestUpdateMany,
          },
        }),
      ),
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);
    jest.spyOn(service as any, `collectPaymentMethodFromCheckout`).mockResolvedValue(undefined);

    await (service as any).finalizeCheckoutSessionSuccess({
      id: `cs_1`,
      metadata: { paymentRequestId: `pr-1`, consumerId: `consumer-1` },
      payment_intent: `pi_1`,
      payment_status: `paid`,
      amount_total: 2500,
      currency: `usd`,
      customer: `cus_1`,
    });

    expect(paymentRequestUpdateMany).toHaveBeenCalledWith({
      where: {
        id: `pr-1`,
        OR: [{ status: { not: $Enums.TransactionStatus.COMPLETED } }, { paymentRail: null }],
      },
      data: {
        status: $Enums.TransactionStatus.COMPLETED,
        paymentRail: $Enums.PaymentRail.CARD,
        updatedBy: `stripe`,
      },
    });
    expect(createOutcomeIdempotent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ledgerEntryId: `ledger-1`,
        status: $Enums.TransactionStatus.COMPLETED,
        externalId: `pi_1`,
      }),
      expect.anything(),
    );
    expect(createOutcomeIdempotent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ledgerEntryId: `ledger-2`,
        status: $Enums.TransactionStatus.COMPLETED,
        externalId: `pi_1`,
      }),
      expect.anything(),
    );
  });

  it(`skips settlement when checkout amount does not match local payment request`, async () => {
    const paymentRequestUpdateMany = jest.fn();
    const ledgerFindMany = jest.fn();
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          ledgerEntryModel: {
            findMany: ledgerFindMany,
          },
          paymentRequestModel: {
            findUnique: jest.fn().mockResolvedValue({
              amount: 25,
              currencyCode: $Enums.CurrencyCode.USD,
              payerId: `consumer-1`,
              payer: { stripeCustomerId: `cus_1` },
            }),
            updateMany: paymentRequestUpdateMany,
          },
        }),
      ),
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);
    jest.spyOn(service as any, `collectPaymentMethodFromCheckout`).mockResolvedValue(undefined);

    await (service as any).finalizeCheckoutSessionSuccess({
      id: `cs_1`,
      metadata: { paymentRequestId: `pr-1`, consumerId: `consumer-1` },
      payment_intent: `pi_1`,
      payment_status: `paid`,
      amount_total: 2600,
      currency: `usd`,
      customer: `cus_1`,
    });

    expect(ledgerFindMany).not.toHaveBeenCalled();
    expect(paymentRequestUpdateMany).not.toHaveBeenCalled();
  });
});

describe(`StripeWebhookPaymentMethodsService.collectPaymentMethodFromCheckout`, () => {
  it(`serializes duplicate checkout storage and skips create when method already exists`, async () => {
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
      billingDetailsModel: {
        create: jest.fn(),
      },
      paymentMethodModel: {
        count: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({ id: `pm-local-1` }),
      },
    };
    const prisma = {
      $transaction: jest
        .fn()
        .mockImplementation(async (callback: (innerTx: typeof tx) => Promise<unknown>) => callback(tx)),
    } as any;
    const stripe = {
      paymentIntents: {
        retrieve: jest.fn().mockResolvedValue({ payment_method: `pm_1` }),
      },
      paymentMethods: {
        attach: jest.fn(),
        retrieve: jest.fn().mockResolvedValue({
          id: `pm_1`,
          type: `card`,
          customer: `cus_1`,
          billing_details: { email: `payer@example.com`, name: `Payer`, phone: null },
          card: { brand: `visa`, exp_month: 12, exp_year: 2030, fingerprint: `fp_1`, last4: `4242` },
        }),
      },
    } as any;
    const service = new StripeWebhookPaymentMethodsService(prisma, stripe);

    await service.collectPaymentMethodFromCheckout({ payment_intent: `pi_1` } as any, `consumer-1`, {
      ensureStripeCustomer: jest.fn().mockResolvedValue({ customerId: `cus_1` }),
    });

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.paymentMethodModel.findFirst).toHaveBeenCalledWith({
      where: {
        consumerId: `consumer-1`,
        deletedAt: null,
        OR: [{ stripePaymentMethodId: `pm_1` }, { stripeFingerprint: `fp_1` }],
      },
    });
    expect(tx.billingDetailsModel.create).not.toHaveBeenCalled();
    expect(tx.paymentMethodModel.create).not.toHaveBeenCalled();
  });

  it(`clears previous defaults before creating the first checkout-backed default method`, async () => {
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
      billingDetailsModel: {
        create: jest.fn().mockResolvedValue({ id: `bd-1` }),
      },
      paymentMethodModel: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: `pm-local-1` }),
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: jest
        .fn()
        .mockImplementation(async (callback: (innerTx: typeof tx) => Promise<unknown>) => callback(tx)),
    } as any;
    const stripe = {
      paymentIntents: {
        retrieve: jest.fn().mockResolvedValue({ payment_method: `pm_1` }),
      },
      paymentMethods: {
        attach: jest.fn(),
        retrieve: jest.fn().mockResolvedValue({
          id: `pm_1`,
          type: `card`,
          customer: `cus_1`,
          billing_details: { email: `payer@example.com`, name: `Payer`, phone: null },
          card: { brand: `visa`, exp_month: 12, exp_year: 2030, fingerprint: `fp_1`, last4: `4242` },
        }),
      },
    } as any;
    const service = new StripeWebhookPaymentMethodsService(prisma, stripe);

    await service.collectPaymentMethodFromCheckout({ payment_intent: `pi_1` } as any, `consumer-1`, {
      ensureStripeCustomer: jest.fn().mockResolvedValue({ customerId: `cus_1` }),
    });

    expect(tx.paymentMethodModel.updateMany).toHaveBeenCalledWith({
      where: {
        consumerId: `consumer-1`,
        deletedAt: null,
        type: $Enums.PaymentMethodType.CREDIT_CARD,
      },
      data: { defaultSelected: false },
    });
    expect(tx.paymentMethodModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          defaultSelected: true,
          stripeFingerprint: `fp_1`,
        }),
      }),
    );
  });

  it(`swallows duplicate-key races when the row becomes visible after P2002`, async () => {
    const duplicateError = Object.assign(Object.create(Prisma.PrismaClientKnownRequestError.prototype), {
      code: `P2002`,
    });
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
      billingDetailsModel: {
        create: jest.fn().mockResolvedValue({ id: `bd-1` }),
      },
      paymentMethodModel: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockRejectedValue(duplicateError),
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const prisma = {
      $transaction: jest
        .fn()
        .mockImplementation(async (callback: (innerTx: typeof tx) => Promise<unknown>) => callback(tx)),
      paymentMethodModel: {
        findFirst: jest.fn().mockResolvedValue({ id: `pm-visible-after-race` }),
      },
    } as any;
    const stripe = {
      paymentIntents: {
        retrieve: jest.fn().mockResolvedValue({ payment_method: `pm_1` }),
      },
      paymentMethods: {
        attach: jest.fn(),
        retrieve: jest.fn().mockResolvedValue({
          id: `pm_1`,
          type: `card`,
          customer: `cus_1`,
          billing_details: { email: `payer@example.com`, name: `Payer`, phone: null },
          card: { brand: `visa`, exp_month: 12, exp_year: 2030, fingerprint: `fp_1`, last4: `4242` },
        }),
      },
    } as any;
    const service = new StripeWebhookPaymentMethodsService(prisma, stripe);

    await expect(
      service.collectPaymentMethodFromCheckout({ payment_intent: `pi_1` } as any, `consumer-1`, {
        ensureStripeCustomer: jest.fn().mockResolvedValue({ customerId: `cus_1` }),
      }),
    ).resolves.toBeUndefined();

    expect(prisma.paymentMethodModel.findFirst).toHaveBeenCalledWith({
      where: {
        consumerId: `consumer-1`,
        deletedAt: null,
        OR: [{ stripePaymentMethodId: `pm_1` }, { stripeFingerprint: `fp_1` }],
      },
      select: { id: true },
    });
  });
});

describe(`StripeWebhookService.handleRefundUpdated`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makeService() {
    const tx = {
      ledgerEntryModel: {
        findMany: jest.fn().mockResolvedValue([{ id: `entry-1` }]),
      },
    } as any;
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => callback(tx)),
    } as any;
    const mailingService = {} as any;
    const balanceService = {} as any;
    const consumerPaymentsService = {} as any;
    return {
      service: new StripeWebhookService(prisma, mailingService, balanceService, consumerPaymentsService),
      prisma,
      tx,
    };
  }

  it(`uses transition-scoped externalId for refund status updates`, async () => {
    const { service, tx } = makeService();

    await (service as any).handleRefundUpdated({ id: `re_1`, status: `pending` });

    expect(tx.ledgerEntryModel.findMany).toHaveBeenCalledWith({
      where: {
        stripeId: `re_1`,
        type: {
          in: [$Enums.LedgerEntryType.USER_PAYMENT_REVERSAL, $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL],
        },
      },
      select: { id: true },
    });
    expect(createOutcomeIdempotent).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        ledgerEntryId: `entry-1`,
        status: $Enums.TransactionStatus.PENDING,
        source: `stripe`,
        externalId: `refund-update:re_1:${$Enums.TransactionStatus.PENDING}`,
      }),
      expect.any(Object),
    );
  });

  it(`uses distinct idempotency keys for pending and completed transitions`, async () => {
    const { service } = makeService();

    await (service as any).handleRefundUpdated({ id: `re_2`, status: `pending` });
    await (service as any).handleRefundUpdated({ id: `re_2`, status: `succeeded` });

    const externalIds = (createOutcomeIdempotent as jest.Mock).mock.calls.map((call) => call[1].externalId);
    expect(externalIds).toContain(`refund-update:re_2:${$Enums.TransactionStatus.PENDING}`);
    expect(externalIds).toContain(`refund-update:re_2:${$Enums.TransactionStatus.COMPLETED}`);
  });

  it(`maps canceled refund to denied transition`, async () => {
    const { service } = makeService();

    await (service as any).handleRefundUpdated({ id: `re_3`, status: `canceled` });

    expect(createOutcomeIdempotent).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        ledgerEntryId: `entry-1`,
        status: $Enums.TransactionStatus.DENIED,
        externalId: `refund-update:re_3:${$Enums.TransactionStatus.DENIED}`,
      }),
      expect.any(Object),
    );
  });

  it(`creates requester deposit reversal when original settlement was a deposit`, async () => {
    const txExecuteRaw = jest.fn().mockResolvedValue(undefined);
    const txLedgerFindMany = jest.fn().mockResolvedValue([]);
    const txLedgerFindFirst = jest
      .fn()
      .mockResolvedValueOnce({ type: $Enums.LedgerEntryType.USER_DEPOSIT, ledgerId: `settlement-ledger-1` })
      .mockResolvedValueOnce({ ledgerId: `payer-ledger-1` });
    const txLedgerCreate = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          $executeRaw: txExecuteRaw,
          ledgerEntryModel: {
            findMany: txLedgerFindMany,
            findFirst: txLedgerFindFirst,
            create: txLedgerCreate,
          },
        }),
      ),
      consumerModel: {
        findMany: jest.fn().mockResolvedValue([
          { id: `payer-1`, email: `payer@example.com` },
          { id: `requester-1`, email: `requester@example.com` },
        ]),
      },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);
    jest.spyOn(service as any, `sendReversalEmails`).mockResolvedValue(undefined);

    await (service as any).createStripeReversal({
      paymentRequestId: `pr-1`,
      payerId: `payer-1`,
      requesterId: `requester-1`,
      requesterEmail: `requester@example.com`,
      requestAmount: 25,
      amount: 25,
      currencyCode: $Enums.CurrencyCode.USD,
      kind: `REFUND`,
      stripeObjectId: `re_1`,
    });

    expect(txLedgerCreate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          consumerId: `payer-1`,
          type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
          amount: 25,
          metadata: expect.objectContaining({
            reversalOfLedgerId: `payer-ledger-1`,
          }),
        }),
      }),
    );
    expect(txLedgerCreate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          consumerId: `requester-1`,
          type: $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL,
          amount: -25,
          metadata: expect.objectContaining({
            reversalOfLedgerId: `settlement-ledger-1`,
          }),
        }),
      }),
    );
  });

  const cardSettlementReversalCase = [
    `creates requester deposit reversal for card-funded settlements`,
    `without mutating the original ledger type`,
  ].join(` `);
  const sharedOutgoingChargebackLockCase = [
    `serializes requester chargebacks with the shared outgoing balance lock`,
    `and pending-aware balance mode`,
  ].join(` `);

  it(cardSettlementReversalCase, async () => {
    const txExecuteRaw = jest.fn().mockResolvedValue(undefined);
    const txLedgerFindMany = jest.fn().mockResolvedValue([]);
    const txLedgerFindFirst = jest
      .fn()
      .mockResolvedValueOnce({
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        ledgerId: `settlement-ledger-card`,
        paymentRequest: {
          paymentRail: $Enums.PaymentRail.CARD,
        },
      })
      .mockResolvedValueOnce({ ledgerId: `payer-ledger-1` });
    const txLedgerCreate = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          $executeRaw: txExecuteRaw,
          ledgerEntryModel: {
            findMany: txLedgerFindMany,
            findFirst: txLedgerFindFirst,
            create: txLedgerCreate,
          },
        }),
      ),
      consumerModel: {
        findMany: jest.fn().mockResolvedValue([
          { id: `payer-1`, email: `payer@example.com` },
          { id: `requester-1`, email: `requester@example.com` },
        ]),
      },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);
    jest.spyOn(service as any, `sendReversalEmails`).mockResolvedValue(undefined);

    await (service as any).createStripeReversal({
      paymentRequestId: `pr-card`,
      payerId: `payer-1`,
      requesterId: `requester-1`,
      requesterEmail: `requester@example.com`,
      requestAmount: 25,
      amount: 25,
      currencyCode: $Enums.CurrencyCode.USD,
      kind: `REFUND`,
      stripeObjectId: `re_card`,
    });

    expect(txLedgerCreate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          consumerId: `requester-1`,
          type: $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL,
          amount: -25,
          metadata: expect.objectContaining({
            reversalOfLedgerId: `settlement-ledger-card`,
          }),
        }),
      }),
    );
  });

  it(sharedOutgoingChargebackLockCase, async () => {
    const txExecuteRaw = jest.fn().mockResolvedValue(undefined);
    const txLedgerFindMany = jest.fn().mockResolvedValue([]);
    const txLedgerFindFirst = jest
      .fn()
      .mockResolvedValueOnce({
        type: $Enums.LedgerEntryType.USER_DEPOSIT,
        ledgerId: `settlement-ledger-1`,
        paymentRequest: { paymentRail: $Enums.PaymentRail.CARD },
      })
      .mockResolvedValueOnce({ ledgerId: `payer-ledger-1` });
    const txLedgerCreate = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          $executeRaw: txExecuteRaw,
          ledgerEntryModel: {
            findMany: txLedgerFindMany,
            findFirst: txLedgerFindFirst,
            create: txLedgerCreate,
          },
        }),
      ),
      consumerModel: {
        findMany: jest.fn().mockResolvedValue([
          { id: `payer-1`, email: `payer@example.com` },
          { id: `requester-1`, email: `requester@example.com` },
        ]),
      },
    } as any;
    const balanceService = {
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, balanceService, {} as any);
    jest.spyOn(service as any, `sendReversalEmails`).mockResolvedValue(undefined);

    await (service as any).createStripeReversal({
      paymentRequestId: `pr-chargeback`,
      payerId: `payer-1`,
      requesterId: `requester-1`,
      requesterEmail: `requester@example.com`,
      requestAmount: 25,
      amount: 25,
      currencyCode: $Enums.CurrencyCode.USD,
      kind: `CHARGEBACK`,
      stripeObjectId: `dp_1`,
    });

    expect(balanceService.calculateInTransaction).toHaveBeenCalledWith(
      expect.any(Object),
      `requester-1`,
      $Enums.CurrencyCode.USD,
      { mode: BalanceCalculationMode.COMPLETED_AND_PENDING },
    );
    expect(txExecuteRaw).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        values: [`pr-chargeback:stripe-reversal-pr`],
      }),
    );
    expect(txExecuteRaw).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        values: [`requester-1:outgoing`],
      }),
    );
    expect(txExecuteRaw).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        values: [`requester-1:stripe-reversal`],
      }),
    );
    expect(txLedgerCreate).toHaveBeenCalledTimes(2);
  });

  it(`counts existing deposit reversals toward already-reversed amount`, async () => {
    const txLedgerFindMany = jest.fn().mockResolvedValue([
      {
        amount: 25,
        status: $Enums.TransactionStatus.COMPLETED,
        outcomes: [],
      },
    ]);
    const txLedgerCreate = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          $executeRaw: jest.fn().mockResolvedValue(undefined),
          ledgerEntryModel: {
            findMany: txLedgerFindMany,
            findFirst: jest.fn().mockResolvedValue({ type: $Enums.LedgerEntryType.USER_DEPOSIT }),
            create: txLedgerCreate,
          },
        }),
      ),
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);
    jest.spyOn(service as any, `sendReversalEmails`).mockResolvedValue(undefined);

    await (service as any).createStripeReversal({
      paymentRequestId: `pr-2`,
      payerId: `payer-1`,
      requesterId: `requester-1`,
      requesterEmail: `requester@example.com`,
      requestAmount: 25,
      amount: 25,
      currencyCode: $Enums.CurrencyCode.USD,
      kind: `REFUND`,
      stripeObjectId: `re_existing`,
    });

    expect(txLedgerFindMany).toHaveBeenCalledWith({
      where: {
        paymentRequestId: `pr-2`,
        type: {
          in: [$Enums.LedgerEntryType.USER_PAYMENT_REVERSAL, $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL],
        },
      },
      select: {
        amount: true,
        status: true,
        outcomes: {
          orderBy: { createdAt: `desc` },
          take: 1,
          select: { status: true },
        },
      },
    });
    expect(txLedgerCreate).not.toHaveBeenCalled();
  });
});

describe(`StripeWebhookService verification lifecycle`, () => {
  it(`persists pending submission when starting verification`, async () => {
    const consumerPaymentsService = {
      assertProfileCompleteForVerification: jest.fn().mockResolvedValue(undefined),
    } as any;
    const create = jest.fn().mockResolvedValue({
      id: `vs_123`,
      client_secret: `vs_secret_123`,
    });
    const prisma = {
      consumerModel: {
        findUnique: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, consumerPaymentsService);
    (
      service as unknown as {
        stripe: { identity: { verificationSessions: { create: (...args: unknown[]) => Promise<unknown> } } };
      }
    ).stripe = {
      identity: {
        verificationSessions: {
          create,
        },
      },
    };

    await expect(service.startVerifyMeStripeSession(`consumer-1`)).resolves.toEqual({
      clientSecret: `vs_secret_123`,
      sessionId: `vs_123`,
    });

    expect(consumerPaymentsService.assertProfileCompleteForVerification).toHaveBeenCalledWith(`consumer-1`);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: `document`,
        metadata: { consumerId: `consumer-1` },
      }),
      { idempotencyKey: `verify-session:consumer-1:none` },
    );
    expect(prisma.consumerModel.updateMany).toHaveBeenCalledWith({
      where: { id: `consumer-1`, stripeIdentitySessionId: null },
      data: expect.objectContaining({
        stripeIdentityStatus: STRIPE_IDENTITY_STATUS.PENDING_SUBMISSION,
        stripeIdentitySessionId: `vs_123`,
        stripeIdentityLastErrorCode: null,
        stripeIdentityLastErrorReason: null,
        stripeIdentityStartedAt: expect.any(Date),
        stripeIdentityUpdatedAt: expect.any(Date),
        stripeIdentityVerifiedAt: null,
      }),
    });
  });

  it(`reuses the active verification session instead of creating a duplicate`, async () => {
    const consumerPaymentsService = {
      assertProfileCompleteForVerification: jest.fn().mockResolvedValue(undefined),
    } as any;
    const prisma = {
      consumerModel: {
        findUnique: jest.fn().mockResolvedValue({
          stripeIdentityStatus: STRIPE_IDENTITY_STATUS.PENDING_SUBMISSION,
          stripeIdentitySessionId: `vs_existing`,
        }),
        updateMany: jest.fn(),
      },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, consumerPaymentsService);
    const retrieve = jest.fn().mockResolvedValue({
      id: `vs_existing`,
      client_secret: `vs_secret_existing`,
    });
    const create = jest.fn();
    (
      service as unknown as {
        stripe: {
          identity: { verificationSessions: { retrieve: (...args: unknown[]) => Promise<unknown>; create: jest.Mock } };
        };
      }
    ).stripe = {
      identity: {
        verificationSessions: {
          retrieve,
          create,
        },
      },
    };

    await expect(service.startVerifyMeStripeSession(`consumer-1`)).resolves.toEqual({
      clientSecret: `vs_secret_existing`,
      sessionId: `vs_existing`,
    });

    expect(retrieve).toHaveBeenCalledWith(`vs_existing`);
    expect(create).not.toHaveBeenCalled();
    expect(prisma.consumerModel.updateMany).not.toHaveBeenCalled();
  });

  it(`reuses the Stripe Identity idempotency key across retries after the db write fails`, async () => {
    const consumerPaymentsService = {
      assertProfileCompleteForVerification: jest.fn().mockResolvedValue(undefined),
    } as any;
    const create = jest.fn().mockResolvedValue({
      id: `vs_retry`,
      client_secret: `vs_secret_retry`,
    });
    const prisma = {
      consumerModel: {
        findUnique: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockRejectedValueOnce(new Error(`db write failed`)).mockResolvedValueOnce({ count: 1 }),
      },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, consumerPaymentsService);
    (
      service as unknown as {
        stripe: { identity: { verificationSessions: { create: (...args: unknown[]) => Promise<unknown> } } };
      }
    ).stripe = {
      identity: {
        verificationSessions: {
          create,
        },
      },
    };

    await expect(service.startVerifyMeStripeSession(`consumer-1`)).rejects.toThrow(`db write failed`);
    await expect(service.startVerifyMeStripeSession(`consumer-1`)).resolves.toEqual({
      clientSecret: `vs_secret_retry`,
      sessionId: `vs_retry`,
    });

    expect(create).toHaveBeenNthCalledWith(1, expect.objectContaining({ metadata: { consumerId: `consumer-1` } }), {
      idempotencyKey: `verify-session:consumer-1:none`,
    });
    expect(create).toHaveBeenNthCalledWith(2, expect.objectContaining({ metadata: { consumerId: `consumer-1` } }), {
      idempotencyKey: `verify-session:consumer-1:none`,
    });
  });

  it(`returns one logical session when two first-time starts overlap`, async () => {
    const consumerPaymentsService = {
      assertProfileCompleteForVerification: jest.fn().mockResolvedValue(undefined),
    } as any;
    let releaseCreate: (() => void) | undefined;
    const createGate = new Promise<void>((resolve) => {
      releaseCreate = resolve;
    });
    let createCallCount = 0;
    const create = jest.fn().mockImplementation(async () => {
      createCallCount += 1;
      if (createCallCount === 1) {
        await createGate;
      }
      return {
        id: `vs_race`,
        client_secret: `vs_secret_race`,
      };
    });
    const retrieve = jest.fn().mockResolvedValue({
      id: `vs_race`,
      client_secret: `vs_secret_race`,
    });
    const findUnique = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce({
      stripeIdentityStatus: STRIPE_IDENTITY_STATUS.PENDING_SUBMISSION,
      stripeIdentitySessionId: `vs_race`,
    });
    const prisma = {
      consumerModel: {
        findUnique,
        updateMany: jest.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 }),
      },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, consumerPaymentsService);
    (
      service as unknown as {
        stripe: {
          identity: {
            verificationSessions: {
              create: (...args: unknown[]) => Promise<unknown>;
              retrieve: (...args: unknown[]) => Promise<unknown>;
            };
          };
        };
      }
    ).stripe = {
      identity: {
        verificationSessions: {
          create,
          retrieve,
        },
      },
    };

    const firstPromise = service.startVerifyMeStripeSession(`consumer-1`);
    await Promise.resolve();
    const secondPromise = service.startVerifyMeStripeSession(`consumer-1`);
    releaseCreate?.();

    const [first, second] = await Promise.all([firstPromise, secondPromise]);

    expect(first).toEqual({ clientSecret: `vs_secret_race`, sessionId: `vs_race` });
    expect(second).toEqual({ clientSecret: `vs_secret_race`, sessionId: `vs_race` });
    expect(create).toHaveBeenCalled();
    expect(
      create.mock.calls.every(
        ([params, options]) =>
          (params as { metadata?: Record<string, unknown> }).metadata?.consumerId === `consumer-1` &&
          (options as { idempotencyKey?: string }).idempotencyKey === `verify-session:consumer-1:none`,
      ),
    ).toBe(true);
  });

  it(`stores requires_input state and last error details`, async () => {
    const prisma = {
      consumerModel: {
        findUnique: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);

    await expect(
      (service as any).handleRequiresInput({
        id: `vs_456`,
        metadata: { consumerId: `consumer-1` },
        last_error: {
          code: `document_expired`,
          reason: `The provided document has expired.`,
        },
      }),
    ).resolves.toBeUndefined();

    expect(prisma.consumerModel.updateMany).toHaveBeenCalledWith({
      where: {
        id: `consumer-1`,
        OR: [{ stripeIdentitySessionId: `vs_456` }, { stripeIdentitySessionId: null }],
      },
      data: expect.objectContaining({
        legalVerified: false,
        stripeIdentityStatus: STRIPE_IDENTITY_STATUS.REQUIRES_INPUT,
        stripeIdentitySessionId: `vs_456`,
        stripeIdentityLastErrorCode: `document_expired`,
        stripeIdentityLastErrorReason: `The provided document has expired.`,
        stripeIdentityUpdatedAt: expect.any(Date),
        stripeIdentityVerifiedAt: null,
      }),
    });
  });

  it(`ignores stale requires_input events from an older verification session`, async () => {
    const loggerWarn = jest.fn();
    const prisma = {
      consumerModel: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue({
          id: `consumer-1`,
          stripeIdentitySessionId: `vs_current`,
        }),
      },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);
    (service as any).logger.warn = loggerWarn;

    await expect(
      (service as any).handleRequiresInput({
        id: `vs_stale`,
        metadata: { consumerId: `consumer-1` },
        last_error: {
          code: `document_expired`,
          reason: `The provided document has expired.`,
        },
      }),
    ).resolves.toBeUndefined();

    expect(prisma.consumerModel.updateMany).toHaveBeenCalledWith({
      where: {
        id: `consumer-1`,
        OR: [{ stripeIdentitySessionId: `vs_stale` }, { stripeIdentitySessionId: null }],
      },
      data: expect.objectContaining({
        stripeIdentityStatus: STRIPE_IDENTITY_STATUS.REQUIRES_INPUT,
      }),
    });
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        message: `Ignoring stale verification session update`,
        incomingSessionId: `vs_stale`,
        currentSessionId: `vs_current`,
      }),
    );
  });

  it(`ignores requires_input replays that would downgrade a verified session`, async () => {
    const loggerWarn = jest.fn();
    const prisma = {
      consumerModel: {
        findUnique: jest.fn().mockResolvedValue({
          stripeIdentitySessionId: `vs_verified`,
          stripeIdentityStatus: STRIPE_IDENTITY_STATUS.VERIFIED,
          legalVerified: true,
        }),
        updateMany: jest.fn(),
      },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);
    (service as any).logger.warn = loggerWarn;

    await expect(
      (service as any).handleRequiresInput({
        id: `vs_verified`,
        metadata: { consumerId: `consumer-1` },
        last_error: {
          code: `document_expired`,
          reason: `The provided document has expired.`,
        },
      }),
    ).resolves.toBeUndefined();

    expect(prisma.consumerModel.updateMany).not.toHaveBeenCalled();
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        message: `Ignoring verification session regression`,
        sessionId: `vs_verified`,
        incomingStatus: STRIPE_IDENTITY_STATUS.REQUIRES_INPUT,
        currentStatus: STRIPE_IDENTITY_STATUS.VERIFIED,
      }),
    );
  });

  it(`stores verified status, clears previous Stripe identity errors, and preserves passport/id data`, async () => {
    const prisma = {
      consumerModel: {
        findFirst: jest.fn().mockResolvedValue({
          id: `consumer-1`,
          stripeIdentitySessionId: `vs_789`,
          personalDetails: {
            firstName: `Existing`,
            lastName: `Person`,
            dateOfBirth: new Date(`1990-01-01T00:00:00.000Z`),
            citizenOf: `US`,
            passportOrIdNumber: `A1234567`,
          },
        }),
        update: jest.fn().mockResolvedValue({ id: `consumer-1` }),
      },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);

    await expect(
      (service as any).handleVerified({
        id: `vs_789`,
        metadata: { consumerId: `consumer-1` },
        verified_outputs: {
          first_name: `Verified`,
          last_name: `User`,
          dob: { year: 1994, month: 6, day: 18 },
          address: { country: `CA` },
        },
      }),
    ).resolves.toEqual({ id: `consumer-1` });

    expect(prisma.consumerModel.update).toHaveBeenCalledWith({
      where: { id: `consumer-1` },
      data: expect.objectContaining({
        legalVerified: true,
        stripeIdentityStatus: STRIPE_IDENTITY_STATUS.VERIFIED,
        stripeIdentitySessionId: `vs_789`,
        stripeIdentityLastErrorCode: null,
        stripeIdentityLastErrorReason: null,
        stripeIdentityUpdatedAt: expect.any(Date),
        stripeIdentityVerifiedAt: expect.any(Date),
        personalDetails: {
          upsert: {
            create: expect.objectContaining({
              passportOrIdNumber: `A1234567`,
            }),
            update: expect.objectContaining({
              passportOrIdNumber: `A1234567`,
            }),
          },
        },
      }),
      include: { personalDetails: true },
    });
  });

  for (const [eventType, expectedStatus] of [
    [STRIPE_IDENTITY_STATUS.CANCELED, `identity.verification_session.canceled`],
    [STRIPE_IDENTITY_STATUS.REDACTED, `identity.verification_session.redacted`],
  ] as const) {
    it(`aligns verification flags when session is ${eventType}`, async () => {
      const prisma = {
        consumerModel: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      } as any;
      const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);

      await expect(
        (service as any).handleLifecycleUpdate(
          {
            id: `vs_lifecycle`,
            metadata: { consumerId: `consumer-1` },
          },
          expectedStatus,
        ),
      ).resolves.toBeUndefined();

      expect(prisma.consumerModel.updateMany).toHaveBeenCalledWith({
        where: {
          id: `consumer-1`,
          OR: [{ stripeIdentitySessionId: `vs_lifecycle` }, { stripeIdentitySessionId: null }],
        },
        data: expect.objectContaining({
          legalVerified: false,
          stripeIdentityStatus: eventType,
          stripeIdentitySessionId: `vs_lifecycle`,
          stripeIdentityLastErrorCode: null,
          stripeIdentityLastErrorReason: null,
          stripeIdentityUpdatedAt: expect.any(Date),
          stripeIdentityVerifiedAt: null,
        }),
      });
    });
  }

  it(`retries verification webhook handling after a transient failure`, async () => {
    const tx = {
      stripeWebhookEventModel: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      consumerModel: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as any;
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (callback: (arg: unknown) => Promise<unknown>) => callback(tx)),
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);
    const envModule = jest.requireMock(`../../../envs`) as { envs: { STRIPE_WEBHOOK_SECRET: string } };
    envModule.envs.STRIPE_WEBHOOK_SECRET = `whsec_test`;

    const mockEvent = {
      id: `evt_verify_retry`,
      type: `identity.verification_session.requires_input`,
      data: {
        object: {
          id: `vs_retry`,
          metadata: { consumerId: `consumer-1` },
          last_error: { code: `document_expired`, reason: `The provided document has expired.` },
        },
      },
    };
    (
      service as unknown as {
        stripe: { webhooks: { constructEvent: (...args: unknown[]) => unknown } };
      }
    ).stripe = {
      webhooks: {
        constructEvent: jest.fn().mockReturnValue(mockEvent),
      },
    };

    const handleRequiresInput = jest
      .spyOn(service as any, `handleRequiresInput`)
      .mockRejectedValueOnce(new Error(`transient db failure`))
      .mockResolvedValueOnce(undefined);

    const req = {
      rawBody: Buffer.from(JSON.stringify(mockEvent)),
      headers: { 'stripe-signature': `sig_test` },
    } as any;
    const failedRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as express.Response;
    const successRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as express.Response;

    await service.processStripeEvent(req, failedRes);
    await service.processStripeEvent(req, successRes);

    expect(handleRequiresInput).toHaveBeenCalledTimes(2);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(failedRes.status).toHaveBeenCalledWith(500);
    expect(successRes.json).toHaveBeenCalledWith({ received: true });
  });
});
