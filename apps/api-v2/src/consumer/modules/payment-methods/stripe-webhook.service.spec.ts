import { type default as express } from 'express';
import Stripe from 'stripe';

import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';

import { createOutcomeIdempotent } from './ledger-outcome-idempotent';
import { StripeWebhookDeduplicationRepository } from './stripe-webhook-deduplication.repository';
import { StripeWebhookDeduplicationService } from './stripe-webhook-deduplication.service';
import { StripeWebhookEventProcessorService } from './stripe-webhook-event-processor.service';
import { StripeWebhookPaymentMethodsRepository } from './stripe-webhook-payment-methods.repository';
import { StripeWebhookPaymentMethodsService } from './stripe-webhook-payment-methods.service';
import { StripeWebhookPayoutsRepository } from './stripe-webhook-payouts.repository';
import { StripeWebhookPayoutsService } from './stripe-webhook-payouts.service';
import { StripeWebhookReversalNotificationRepository } from './stripe-webhook-reversal-notification.repository';
import { StripeWebhookReversalNotificationService } from './stripe-webhook-reversal-notification.service';
import { StripeWebhookReversalsRepository } from './stripe-webhook-reversals.repository';
import { StripeWebhookReversalsService } from './stripe-webhook-reversals.service';
import { StripeWebhookRouterService } from './stripe-webhook-router.service';
import { StripeWebhookSettlementsRepository } from './stripe-webhook-settlements.repository';
import { StripeWebhookSettlementsService } from './stripe-webhook-settlements.service';
import { StripeWebhookVerificationRepository } from './stripe-webhook-verification.repository';
import { StripeWebhookVerificationService } from './stripe-webhook-verification.service';
import { StripeWebhookService as StripeWebhookServiceClass } from './stripe-webhook.service';
import { envs } from '../../../envs';
import { BalanceCalculationMode } from '../../../shared/balance-calculation.service';
import { STRIPE_IDENTITY_STATUS } from '../../../shared-common';

const STRIPE_WEBHOOK_EVENT_STATUS = {
  PROCESSING: `PROCESSING`,
  PROCESSED: `PROCESSED`,
  FAILED: `FAILED`,
} as const;

class StripeWebhookService extends StripeWebhookServiceClass {
  constructor(prisma: any, mailingService: any, balanceService: any, consumerPaymentsPoliciesService: any) {
    let stripe: any = new Stripe(envs.STRIPE_SECRET_KEY, { apiVersion: `2025-11-17.clover` });
    const webhookPaymentMethodsRepository = new StripeWebhookPaymentMethodsRepository(prisma);
    const paymentMethodsService = new StripeWebhookPaymentMethodsService(webhookPaymentMethodsRepository, stripe);
    const payoutsRepository = new StripeWebhookPayoutsRepository(prisma);
    const payoutsService = new StripeWebhookPayoutsService(payoutsRepository);
    const settlementsRepository = new StripeWebhookSettlementsRepository(prisma);
    const settlementsService = new StripeWebhookSettlementsService(settlementsRepository);
    const verificationRepository = new StripeWebhookVerificationRepository(prisma);
    const verificationService = new StripeWebhookVerificationService(
      verificationRepository,
      consumerPaymentsPoliciesService,
      stripe,
    );
    const reversalNotificationRepository = new StripeWebhookReversalNotificationRepository(prisma);
    const reversalNotifications = new StripeWebhookReversalNotificationService(
      reversalNotificationRepository,
      mailingService,
    );
    const reversalsRepository = new StripeWebhookReversalsRepository(prisma);
    const reversalsService = new StripeWebhookReversalsService(
      reversalsRepository,
      reversalNotifications,
      balanceService,
      stripe,
    );
    const router = new StripeWebhookRouterService(
      paymentMethodsService,
      payoutsService,
      settlementsService,
      verificationService,
      reversalsService,
    );
    const deduplicationRepository = new StripeWebhookDeduplicationRepository(prisma);
    const eventProcessor = new StripeWebhookEventProcessorService(
      new StripeWebhookDeduplicationService(deduplicationRepository),
    );

    super(
      stripe,
      paymentMethodsService,
      settlementsService,
      verificationService,
      reversalsService,
      router,
      eventProcessor,
    );

    const logger = (this as any).logger;
    (paymentMethodsService as any).logger = logger;
    (payoutsService as any).logger = logger;
    (settlementsService as any).logger = logger;
    (verificationService as any).logger = logger;
    (reversalsService as any).logger = logger;
    (router as any).logger = logger;

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

function makeStripeWebhookDuplicateEventError() {
  return new Prisma.PrismaClientKnownRequestError(`Unique constraint failed on the fields: (event_id)`, {
    code: `P2002`,
    clientVersion: `test`,
    meta: { target: [`event_id`] },
  });
}

async function waitForMockCalls(mock: { mock: { calls: unknown[] } }, expectedCalls: number) {
  for (let attempt = 0; attempt < 10 && mock.mock.calls.length < expectedCalls; attempt += 1) {
    await Promise.resolve();
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
    (service as any).router.routeManagedVerificationEvent = jest
      .fn()
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
    (service as any).router.routeManagedVerificationEvent = jest.fn().mockResolvedValue(undefined);

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

  it(`returns 200 without dispatching when the processed-event marker already exists`, async () => {
    const stripeWebhookEventCreate = jest.fn().mockRejectedValue(makeStripeWebhookDuplicateEventError());
    const stripeWebhookEventFindUnique = jest.fn().mockResolvedValue({
      eventId: `evt_dup`,
      status: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSED,
      processingStartedAt: null,
    });
    const prisma = {
      stripeWebhookEventModel: {
        create: stripeWebhookEventCreate,
        findUnique: stripeWebhookEventFindUnique,
        updateMany: jest.fn(),
      },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);
    const routeEvent = jest.spyOn((service as any).router, `routeEvent`).mockResolvedValue(`handled`);

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

    expect(stripeWebhookEventFindUnique).toHaveBeenCalledWith({
      where: { eventId: `evt_dup` },
      select: { status: true, processingStartedAt: true },
    });
    expect(routeEvent).not.toHaveBeenCalled();
    expect(stripeWebhookEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventId: `evt_dup`,
          eventType: `checkout.session.completed`,
          status: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSING,
          claimToken: expect.any(String),
        }),
      }),
    );
    expect(res.json).toHaveBeenCalledWith({ received: true });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(createOutcomeIdempotent).not.toHaveBeenCalled();
  });

  it(`returns 503 without dispatching when the event is already in fresh processing`, async () => {
    const stripeWebhookEventCreate = jest.fn().mockRejectedValue(makeStripeWebhookDuplicateEventError());
    const prisma = {
      stripeWebhookEventModel: {
        create: stripeWebhookEventCreate,
        findUnique: jest.fn().mockResolvedValue({
          status: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSING,
          processingStartedAt: new Date(),
        }),
        updateMany: jest.fn(),
      },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);
    const routeEvent = jest.spyOn((service as any).router, `routeEvent`).mockResolvedValue(`handled`);

    const mockEvent = {
      id: `evt_in_flight`,
      type: `charge.refunded`,
      data: { object: { id: `ch_in_flight` } },
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

    expect(routeEvent).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ received: false, error: `Webhook event already processing` });
  });

  it(`reclaims stale processing events and dispatches once`, async () => {
    const stripeWebhookEventCreate = jest.fn().mockRejectedValue(makeStripeWebhookDuplicateEventError());
    const stripeWebhookEventUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      stripeWebhookEventModel: {
        create: stripeWebhookEventCreate,
        findUnique: jest.fn().mockResolvedValue({
          status: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSING,
          processingStartedAt: new Date(Date.now() - 20 * 60 * 1000),
        }),
        updateMany: stripeWebhookEventUpdateMany,
      },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);
    const routeEvent = jest.spyOn((service as any).router, `routeEvent`).mockResolvedValue(`handled`);

    const mockEvent = {
      id: `evt_stale_processing`,
      type: `charge.dispute.created`,
      data: { object: { id: `dp_stale` } },
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

    expect(routeEvent).toHaveBeenCalledTimes(1);
    expect(stripeWebhookEventUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventId: `evt_stale_processing`,
          OR: expect.any(Array),
        }),
        data: expect.objectContaining({
          status: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSING,
          claimToken: expect.any(String),
          attemptCount: { increment: 1 },
        }),
      }),
    );
    expect(stripeWebhookEventUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          eventId: `evt_stale_processing`,
          status: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSING,
          claimToken: expect.any(String),
        },
        data: expect.objectContaining({ status: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSED }),
      }),
    );
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it(`does not dispatch money handler twice for concurrent duplicate charge.refunded deliveries`, async () => {
    let releaseHandler: (() => void) | undefined;
    const handlerGate = new Promise<void>((resolve) => {
      releaseHandler = resolve;
    });
    const stripeWebhookEventCreate = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(makeStripeWebhookDuplicateEventError());
    const prisma = {
      stripeWebhookEventModel: {
        create: stripeWebhookEventCreate,
        findUnique: jest.fn().mockResolvedValue({
          status: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSING,
          processingStartedAt: new Date(),
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);
    const handleChargeRefunded = jest
      .spyOn((service as any).reversalsService, `handleChargeRefunded`)
      .mockImplementation(async () => handlerGate);

    const mockEvent = {
      id: `evt_concurrent_refund`,
      type: `charge.refunded`,
      request: { idempotency_key: `refund-key-concurrent` },
      data: { object: { id: `ch_concurrent` } },
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

    const makeReq = () =>
      ({
        rawBody: Buffer.from(JSON.stringify(mockEvent)),
        headers: { 'stripe-signature': `sig_test` },
      }) as any;
    const makeRes = () =>
      ({
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      }) as unknown as express.Response;

    const firstRes = makeRes();
    const secondRes = makeRes();
    const firstProcessing = service.processStripeEvent(makeReq(), firstRes);
    await Promise.resolve();
    const secondProcessing = service.processStripeEvent(makeReq(), secondRes);
    await waitForMockCalls(handleChargeRefunded, 1);

    expect(handleChargeRefunded).toHaveBeenCalledTimes(1);

    releaseHandler?.();
    await Promise.all([firstProcessing, secondProcessing]);

    expect(handleChargeRefunded).toHaveBeenCalledTimes(1);
    expect(firstRes.json).toHaveBeenCalledWith({ received: true });
    expect(secondRes.status).toHaveBeenCalledWith(503);
    expect(secondRes.json).toHaveBeenCalledWith({ received: false, error: `Webhook event already processing` });
  });

  it(`marks the dedupe claim failed when a non-identity handler fails before completion`, async () => {
    const stripeWebhookEventCreate = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(makeStripeWebhookDuplicateEventError());
    const stripeWebhookEventFindUnique = jest.fn().mockResolvedValue({
      status: STRIPE_WEBHOOK_EVENT_STATUS.FAILED,
      processingStartedAt: null,
    });
    const stripeWebhookEventUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      stripeWebhookEventModel: {
        create: stripeWebhookEventCreate,
        findUnique: stripeWebhookEventFindUnique,
        updateMany: stripeWebhookEventUpdateMany,
      },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);
    const routeEvent = jest
      .spyOn((service as any).router, `routeEvent`)
      .mockRejectedValueOnce(new Error(`temporary failure`))
      .mockResolvedValueOnce(`handled`);

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
    expect(stripeWebhookEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventId: `evt_retryable`,
          status: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSING,
          claimToken: expect.any(String),
        }),
      }),
    );
    expect(stripeWebhookEventUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          eventId: `evt_retryable`,
          status: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSING,
          claimToken: expect.any(String),
        },
        data: expect.objectContaining({
          status: STRIPE_WEBHOOK_EVENT_STATUS.FAILED,
          lastErrorClass: `Error`,
          lastErrorMessage: `temporary failure`,
        }),
      }),
    );

    const secondReq = {
      rawBody: Buffer.from(JSON.stringify(mockEvent)),
      headers: { 'stripe-signature': `sig_test` },
    } as any;
    const secondRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as express.Response;

    await service.processStripeEvent(secondReq, secondRes);

    expect(routeEvent).toHaveBeenCalledTimes(2);
    expect(stripeWebhookEventCreate).toHaveBeenCalledTimes(2);
    expect(stripeWebhookEventFindUnique).toHaveBeenCalledWith({
      where: { eventId: `evt_retryable` },
      select: { status: true, processingStartedAt: true },
    });
    expect(secondRes.json).toHaveBeenCalledWith({ received: true });
  });

  it(`dispatches charge.refunded events to handleChargeRefunded`, async () => {
    const stripeWebhookEventCreate = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      stripeWebhookEventModel: {
        create: stripeWebhookEventCreate,
        findUnique: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);
    const handleChargeRefunded = jest
      .spyOn((service as any).reversalsService, `handleChargeRefunded`)
      .mockResolvedValue(undefined);

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
    expect(stripeWebhookEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventId: `evt_charge_refunded`,
          eventType: `charge.refunded`,
          status: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSING,
          claimToken: expect.any(String),
        }),
      }),
    );
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it(`dispatches charge.refund.updated events to handleRefundUpdated`, async () => {
    const stripeWebhookEventCreate = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      stripeWebhookEventModel: {
        create: stripeWebhookEventCreate,
        findUnique: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);
    const handleRefundUpdated = jest
      .spyOn((service as any).reversalsService, `handleRefundUpdated`)
      .mockResolvedValue(undefined);

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
    expect(stripeWebhookEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventId: `evt_refund_updated`,
          eventType: `charge.refund.updated`,
          status: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSING,
          claimToken: expect.any(String),
        }),
      }),
    );
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it(`dispatches charge.dispute.created events to handleChargeDispute`, async () => {
    const stripeWebhookEventCreate = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      stripeWebhookEventModel: {
        create: stripeWebhookEventCreate,
        findUnique: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);
    const handleChargeDispute = jest
      .spyOn((service as any).reversalsService, `handleChargeDispute`)
      .mockResolvedValue(undefined);

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
    expect(stripeWebhookEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventId: `evt_dispute_created`,
          eventType: `charge.dispute.created`,
          status: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSING,
          claimToken: expect.any(String),
        }),
      }),
    );
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  const duplicateRefundUpdatedEventDescription =
    `returns success for duplicate refund.updated event before handler dispatch ` + `when marker already exists`;

  it(duplicateRefundUpdatedEventDescription, async () => {
    const stripeWebhookEventCreate = jest.fn().mockRejectedValue(makeStripeWebhookDuplicateEventError());
    const prisma = {
      stripeWebhookEventModel: {
        create: stripeWebhookEventCreate,
        findUnique: jest.fn().mockResolvedValue({
          eventId: `evt_refund_updated_duplicate`,
          status: STRIPE_WEBHOOK_EVENT_STATUS.PROCESSED,
          processingStartedAt: null,
        }),
        updateMany: jest.fn(),
      },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);
    const handleRefundUpdated = jest
      .spyOn((service as any).reversalsService, `handleRefundUpdated`)
      .mockResolvedValue(undefined);

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

    expect(handleRefundUpdated).not.toHaveBeenCalled();
    expect(stripeWebhookEventCreate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });
});

describe(`StripeWebhookRouterService`, () => {
  function makeRouter() {
    const paymentMethodsService = {
      collectPaymentMethodFromCheckout: jest.fn().mockResolvedValue(undefined),
    } as unknown as StripeWebhookPaymentMethodsService;
    const payoutsService = {
      handlePayoutPaid: jest.fn().mockResolvedValue(undefined),
      handlePayoutFailed: jest.fn().mockResolvedValue(undefined),
    } as unknown as StripeWebhookPayoutsService;
    const settlementsService = {
      finalizeCheckoutSessionSuccess: jest.fn().mockResolvedValue(undefined),
    } as unknown as StripeWebhookSettlementsService;
    const verificationService = {
      isManagedVerificationEvent: jest.fn().mockReturnValue(false),
      processManagedVerificationEvent: jest.fn().mockResolvedValue(undefined),
    } as unknown as StripeWebhookVerificationService;
    const reversalsService = {
      handleChargeRefunded: jest.fn().mockResolvedValue(undefined),
      handleRefundUpdated: jest.fn().mockResolvedValue(undefined),
      handleChargeDispute: jest.fn().mockResolvedValue(undefined),
    } as unknown as StripeWebhookReversalsService;
    const router = new StripeWebhookRouterService(
      paymentMethodsService,
      payoutsService,
      settlementsService,
      verificationService,
      reversalsService,
    );

    return { paymentMethodsService, payoutsService, settlementsService, verificationService, reversalsService, router };
  }

  it(`routes checkout.session.completed to checkout settlement handling`, async () => {
    const { paymentMethodsService, settlementsService, router } = makeRouter();
    const checkoutSession = { id: `cs_router`, metadata: { paymentRequestId: `pr-1`, consumerId: `consumer-1` } };
    const event = {
      id: `evt_router_checkout`,
      type: `checkout.session.completed`,
      data: { object: checkoutSession },
    } as unknown as Stripe.Event;

    await expect(router.routeEvent(event)).resolves.toBe(`handled`);

    expect(settlementsService.finalizeCheckoutSessionSuccess).toHaveBeenCalledWith(
      checkoutSession,
      expect.objectContaining({
        collectPaymentMethodFromCheckout: expect.any(Function),
      }),
    );

    const [, handlers] = (settlementsService.finalizeCheckoutSessionSuccess as jest.Mock).mock.calls[0];
    await handlers.collectPaymentMethodFromCheckout(checkoutSession, `consumer-1`);
    expect(paymentMethodsService.collectPaymentMethodFromCheckout).toHaveBeenCalledWith(checkoutSession, `consumer-1`);
  });

  it(`keeps unsupported webhook event types ignored`, async () => {
    const { payoutsService, settlementsService, reversalsService, router } = makeRouter();
    const event = {
      id: `evt_router_ignored`,
      type: `customer.updated`,
      data: { object: { id: `cus_1` } },
    } as Stripe.Event;

    await expect(router.routeEvent(event)).resolves.toBe(`ignored`);

    expect(settlementsService.finalizeCheckoutSessionSuccess).not.toHaveBeenCalled();
    expect(reversalsService.handleChargeRefunded).not.toHaveBeenCalled();
    expect(reversalsService.handleRefundUpdated).not.toHaveBeenCalled();
    expect(reversalsService.handleChargeDispute).not.toHaveBeenCalled();
    expect(payoutsService.handlePayoutPaid).not.toHaveBeenCalled();
    expect(payoutsService.handlePayoutFailed).not.toHaveBeenCalled();
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

describe(`StripeWebhookReversalsRepository.resolvePaymentRequestByPaymentIntent`, () => {
  const paymentRequestSelect = {
    id: true,
    amount: true,
    currencyCode: true,
    payerId: true,
    requesterId: true,
    requesterEmail: true,
  };

  it(`prefers the newest outcome-backed payment request before checking fallback ledger rows`, async () => {
    const prisma = {
      ledgerEntryOutcomeModel: {
        findFirst: jest.fn().mockResolvedValue({
          ledgerEntry: {
            paymentRequest: {
              id: `pr-outcome`,
              amount: 25,
              currencyCode: $Enums.CurrencyCode.USD,
              payerId: `payer-1`,
              requesterId: `requester-1`,
              requesterEmail: `requester@example.com`,
            },
          },
        }),
      },
      ledgerEntryModel: {
        findFirst: jest.fn(),
      },
    } as any;
    const repository = new StripeWebhookReversalsRepository(prisma);

    await expect(repository.resolvePaymentRequestByPaymentIntent(`pi_1`)).resolves.toEqual({
      id: `pr-outcome`,
      amount: 25,
      currencyCode: $Enums.CurrencyCode.USD,
      payerId: `payer-1`,
      requesterId: `requester-1`,
      requesterEmail: `requester@example.com`,
    });

    expect(prisma.ledgerEntryOutcomeModel.findFirst).toHaveBeenCalledWith({
      where: { externalId: `pi_1` },
      orderBy: { createdAt: `desc` },
      select: {
        ledgerEntry: {
          select: {
            paymentRequest: {
              select: paymentRequestSelect,
            },
          },
        },
      },
    });
    expect(prisma.ledgerEntryModel.findFirst).not.toHaveBeenCalled();
  });

  it(`falls back to the newest USER_PAYMENT ledger entry when the outcome lookup misses`, async () => {
    const prisma = {
      ledgerEntryOutcomeModel: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      ledgerEntryModel: {
        findFirst: jest.fn().mockResolvedValue({
          paymentRequest: {
            id: `pr-fallback`,
            amount: 30,
            currencyCode: $Enums.CurrencyCode.GBP,
            payerId: `payer-2`,
            requesterId: `requester-2`,
            requesterEmail: `requester-2@example.com`,
          },
        }),
      },
    } as any;
    const repository = new StripeWebhookReversalsRepository(prisma);

    await expect(repository.resolvePaymentRequestByPaymentIntent(`pi_2`)).resolves.toEqual({
      id: `pr-fallback`,
      amount: 30,
      currencyCode: $Enums.CurrencyCode.GBP,
      payerId: `payer-2`,
      requesterId: `requester-2`,
      requesterEmail: `requester-2@example.com`,
    });

    expect(prisma.ledgerEntryModel.findFirst).toHaveBeenCalledWith({
      where: {
        stripeId: `pi_2`,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
      },
      select: {
        paymentRequest: {
          select: paymentRequestSelect,
        },
      },
      orderBy: { createdAt: `desc` },
    });
  });

  it(`returns null when neither lookup resolves a payment request`, async () => {
    const prisma = {
      ledgerEntryOutcomeModel: {
        findFirst: jest.fn().mockResolvedValue({
          ledgerEntry: {
            paymentRequest: null,
          },
        }),
      },
      ledgerEntryModel: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as any;
    const repository = new StripeWebhookReversalsRepository(prisma);

    await expect(repository.resolvePaymentRequestByPaymentIntent(`pi_3`)).resolves.toBeNull();
    expect(prisma.ledgerEntryModel.findFirst).toHaveBeenCalledTimes(1);
  });
});

describe(`StripeWebhookReversalsRepository.resolveDisputeLedgerEntryIdByPaymentIntent`, () => {
  it(`prefers the newest direct USER_PAYMENT ledger row before checking outcomes`, async () => {
    const prisma = {
      ledgerEntryModel: {
        findFirst: jest.fn().mockResolvedValue({ id: `ledger-direct` }),
      },
      ledgerEntryOutcomeModel: {
        findFirst: jest.fn(),
      },
    } as any;
    const repository = new StripeWebhookReversalsRepository(prisma);

    await expect(repository.resolveDisputeLedgerEntryIdByPaymentIntent(`pi_direct`)).resolves.toBe(`ledger-direct`);

    expect(prisma.ledgerEntryModel.findFirst).toHaveBeenCalledWith({
      where: {
        stripeId: `pi_direct`,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
      },
      select: { id: true },
      orderBy: { createdAt: `desc` },
    });
    expect(prisma.ledgerEntryOutcomeModel.findFirst).not.toHaveBeenCalled();
  });

  it(`falls back to the newest outcome row when no direct USER_PAYMENT ledger row exists`, async () => {
    const prisma = {
      ledgerEntryModel: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      ledgerEntryOutcomeModel: {
        findFirst: jest.fn().mockResolvedValue({ ledgerEntryId: `ledger-outcome` }),
      },
    } as any;
    const repository = new StripeWebhookReversalsRepository(prisma);

    await expect(repository.resolveDisputeLedgerEntryIdByPaymentIntent(`pi_outcome`)).resolves.toBe(`ledger-outcome`);

    expect(prisma.ledgerEntryOutcomeModel.findFirst).toHaveBeenCalledWith({
      where: { externalId: `pi_outcome` },
      orderBy: { createdAt: `desc` },
      select: { ledgerEntryId: true },
    });
  });

  it(`returns null when neither direct nor outcome lookup resolves a ledger entry`, async () => {
    const prisma = {
      ledgerEntryModel: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      ledgerEntryOutcomeModel: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as any;
    const repository = new StripeWebhookReversalsRepository(prisma);

    await expect(repository.resolveDisputeLedgerEntryIdByPaymentIntent(`pi_missing`)).resolves.toBeNull();
    expect(prisma.ledgerEntryOutcomeModel.findFirst).toHaveBeenCalledTimes(1);
  });
});

describe(`StripeWebhookSettlementsService.finalizeCheckoutSessionSuccess`, () => {
  function createRepositoryMock(settlementReady = true) {
    return {
      finalizeCheckoutSettlement: jest.fn().mockResolvedValue(settlementReady),
    } as unknown as jest.Mocked<StripeWebhookSettlementsRepository>;
  }

  it(`delegates checkout settlement persistence to the repository before collecting payment methods`, async () => {
    const settlementsRepository = createRepositoryMock();
    const service = new StripeWebhookSettlementsService(settlementsRepository);
    const collectPaymentMethodFromCheckout = jest.fn().mockResolvedValue(undefined);

    await service.finalizeCheckoutSessionSuccess(
      {
        id: `cs_1`,
        metadata: { paymentRequestId: `pr-1`, consumerId: `consumer-1` },
        payment_intent: `pi_1`,
        payment_status: `paid`,
        amount_total: 2500,
        currency: `usd`,
        customer: `cus_1`,
      } as unknown as Stripe.Checkout.Session,
      { collectPaymentMethodFromCheckout },
    );

    expect(settlementsRepository.finalizeCheckoutSettlement).toHaveBeenCalledWith({
      checkoutSessionId: `cs_1`,
      paymentRequestId: `pr-1`,
      consumerId: `consumer-1`,
      paymentIntentId: `pi_1`,
      paymentStatus: `paid`,
      amountTotal: 2500,
      currency: `usd`,
      customerId: `cus_1`,
      logger: expect.anything(),
    });
    expect(collectPaymentMethodFromCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ id: `cs_1` }),
      `consumer-1`,
    );
  });

  it(`does not collect payment methods when settlement persistence is skipped`, async () => {
    const settlementsRepository = createRepositoryMock(false);
    const service = new StripeWebhookSettlementsService(settlementsRepository);
    const collectPaymentMethodFromCheckout = jest.fn();

    await service.finalizeCheckoutSessionSuccess(
      {
        id: `cs_1`,
        metadata: { paymentRequestId: `pr-1`, consumerId: `consumer-1` },
        payment_intent: `pi_1`,
        payment_status: `paid`,
        amount_total: 2600,
        currency: `usd`,
        customer: `cus_1`,
      } as unknown as Stripe.Checkout.Session,
      { collectPaymentMethodFromCheckout },
    );

    expect(collectPaymentMethodFromCheckout).not.toHaveBeenCalled();
  });
});

describe(`StripeWebhookSettlementsRepository.finalizeCheckoutSettlement`, () => {
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
    const repository = new StripeWebhookSettlementsRepository(prisma);

    await repository.finalizeCheckoutSettlement({
      checkoutSessionId: `cs_1`,
      paymentRequestId: `pr-1`,
      consumerId: `consumer-1`,
      paymentIntentId: `pi_1`,
      paymentStatus: `paid`,
      amountTotal: 2500,
      currency: `usd`,
      customerId: `cus_1`,
      logger: { warn: jest.fn() } as any,
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
    const repository = new StripeWebhookSettlementsRepository(prisma);

    await repository.finalizeCheckoutSettlement({
      checkoutSessionId: `cs_1`,
      paymentRequestId: `pr-1`,
      consumerId: `consumer-1`,
      paymentIntentId: `pi_1`,
      paymentStatus: `paid`,
      amountTotal: 2600,
      currency: `usd`,
      customerId: `cus_1`,
      logger: { warn: jest.fn() } as any,
    });

    expect(ledgerFindMany).not.toHaveBeenCalled();
    expect(paymentRequestUpdateMany).not.toHaveBeenCalled();
  });
});

describe(`StripeWebhookPaymentMethodsService.collectPaymentMethodFromCheckout`, () => {
  function createRepositoryMock() {
    return {
      storeCheckoutPaymentMethod: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<StripeWebhookPaymentMethodsRepository>;
  }

  function createStripeMock(paymentMethod: Partial<Stripe.PaymentMethod> = {}) {
    return {
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
          ...paymentMethod,
        }),
      },
    } as unknown as Stripe;
  }

  it(`delegates checkout payment method storage to the repository`, async () => {
    const repository = createRepositoryMock();
    const stripe = createStripeMock();
    const service = new StripeWebhookPaymentMethodsService(repository, stripe);

    await service.collectPaymentMethodFromCheckout({ payment_intent: `pi_1` } as any, `consumer-1`, {
      ensureStripeCustomer: jest.fn().mockResolvedValue({ customerId: `cus_1` }),
    });

    expect(repository.storeCheckoutPaymentMethod).toHaveBeenCalledWith({
      consumerId: `consumer-1`,
      type: $Enums.PaymentMethodType.CREDIT_CARD,
      stripePaymentMethodId: `pm_1`,
      stripeFingerprint: `fp_1`,
      brand: `visa`,
      last4: `4242`,
      expMonth: `12`,
      expYear: `2030`,
      billingDetails: { email: `payer@example.com`, name: `Payer`, phone: null },
    });
  });

  it(`does not store unsupported payment method types`, async () => {
    const repository = createRepositoryMock();
    const stripe = createStripeMock({
      type: `us_bank_account`,
      card: null,
    } as Partial<Stripe.PaymentMethod>);
    const service = new StripeWebhookPaymentMethodsService(repository, stripe);

    await service.collectPaymentMethodFromCheckout({ payment_intent: `pi_1` } as any, `consumer-1`, {
      ensureStripeCustomer: jest.fn().mockResolvedValue({ customerId: `cus_1` }),
    });

    expect(repository.storeCheckoutPaymentMethod).not.toHaveBeenCalled();
  });

  it(`skips storage when Stripe says the payment method cannot be reused`, async () => {
    const repository = createRepositoryMock();
    const stripe = {
      paymentIntents: {
        retrieve: jest.fn().mockResolvedValue({ payment_method: `pm_1` }),
      },
      paymentMethods: {
        attach: jest.fn().mockRejectedValue({
          type: `invalid_request_error`,
          message: `This payment method was previously used without being attached to a Customer`,
        }),
        retrieve: jest.fn().mockResolvedValue({
          id: `pm_1`,
          type: `card`,
          customer: null,
          billing_details: { email: `payer@example.com`, name: `Payer`, phone: null },
          card: { brand: `visa`, exp_month: 12, exp_year: 2030, fingerprint: `fp_1`, last4: `4242` },
        }),
      },
    } as unknown as Stripe;
    const service = new StripeWebhookPaymentMethodsService(repository, stripe);

    await service.collectPaymentMethodFromCheckout({ payment_intent: `pi_1` } as any, `consumer-1`, {
      ensureStripeCustomer: jest.fn().mockResolvedValue({ customerId: `cus_1` }),
    });

    expect(repository.storeCheckoutPaymentMethod).not.toHaveBeenCalled();
  });
});

describe(`StripeWebhookPaymentMethodsRepository.storeCheckoutPaymentMethod`, () => {
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
    const repository = new StripeWebhookPaymentMethodsRepository(prisma);

    await repository.storeCheckoutPaymentMethod({
      consumerId: `consumer-1`,
      type: $Enums.PaymentMethodType.CREDIT_CARD,
      stripePaymentMethodId: `pm_1`,
      stripeFingerprint: `fp_1`,
      brand: `visa`,
      last4: `4242`,
      expMonth: `12`,
      expYear: `2030`,
      billingDetails: { email: `payer@example.com`, name: `Payer`, phone: null },
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
    const repository = new StripeWebhookPaymentMethodsRepository(prisma);

    await repository.storeCheckoutPaymentMethod({
      consumerId: `consumer-1`,
      type: $Enums.PaymentMethodType.CREDIT_CARD,
      stripePaymentMethodId: `pm_1`,
      stripeFingerprint: `fp_1`,
      brand: `visa`,
      last4: `4242`,
      expMonth: `12`,
      expYear: `2030`,
      billingDetails: { email: `payer@example.com`, name: `Payer`, phone: null },
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
    const repository = new StripeWebhookPaymentMethodsRepository(prisma);

    await expect(
      repository.storeCheckoutPaymentMethod({
        consumerId: `consumer-1`,
        type: $Enums.PaymentMethodType.CREDIT_CARD,
        stripePaymentMethodId: `pm_1`,
        stripeFingerprint: `fp_1`,
        brand: `visa`,
        last4: `4242`,
        expMonth: `12`,
        expYear: `2030`,
        billingDetails: { email: `payer@example.com`, name: `Payer`, phone: null },
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
      .spyOn((service as any).verificationService, `handleRequiresInput`)
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
