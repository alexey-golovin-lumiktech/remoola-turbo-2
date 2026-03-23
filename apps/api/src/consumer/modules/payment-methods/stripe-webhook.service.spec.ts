import { type default as express } from 'express';

import { $Enums, Prisma } from '@remoola/database-2';

import { createOutcomeIdempotent } from './ledger-outcome-idempotent';
import { StripeWebhookService } from './stripe-webhook.service';
import { STRIPE_IDENTITY_STATUS } from '../../../shared-common';

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

  it(`logs sanitized warning and returns 400 when webhook processing throws`, async () => {
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
        errorClass: `Error`,
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

  it(`on duplicate event (P2002) returns 200 and skips processing without calling handlers`, async () => {
    const stripeWebhookEventCreate = jest
      .fn()
      .mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(`Unique constraint`, { code: `P2002`, clientVersion: `6.x` }),
      );
    const prisma = {
      stripeWebhookEventModel: { create: stripeWebhookEventCreate },
    } as any;
    const service = new StripeWebhookService(prisma, {} as any, {} as any, {} as any);

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

    expect(res.json).toHaveBeenCalledWith({ received: true });
    expect(res.status).not.toHaveBeenCalled();
    expect(createOutcomeIdempotent).not.toHaveBeenCalled();
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
      where: { stripeId: `re_1`, type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL },
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
});

describe(`StripeWebhookService verification lifecycle`, () => {
  it(`persists pending submission when starting verification`, async () => {
    const consumerPaymentsService = {
      assertProfileCompleteForVerification: jest.fn().mockResolvedValue(undefined),
    } as any;
    const prisma = {
      consumerModel: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({ id: `consumer-1` }),
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
          create: jest.fn().mockResolvedValue({
            id: `vs_123`,
            client_secret: `vs_secret_123`,
          }),
        },
      },
    };

    await expect(service.startVerifyMeStripeSession(`consumer-1`)).resolves.toEqual({
      clientSecret: `vs_secret_123`,
      sessionId: `vs_123`,
    });

    expect(consumerPaymentsService.assertProfileCompleteForVerification).toHaveBeenCalledWith(`consumer-1`);
    expect(prisma.consumerModel.update).toHaveBeenCalledWith({
      where: { id: `consumer-1` },
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
        update: jest.fn(),
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
    expect(prisma.consumerModel.update).not.toHaveBeenCalled();
  });

  it(`stores requires_input state and last error details`, async () => {
    const prisma = {
      consumerModel: {
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
    expect(failedRes.status).toHaveBeenCalledWith(400);
    expect(successRes.json).toHaveBeenCalledWith({ received: true });
  });
});
