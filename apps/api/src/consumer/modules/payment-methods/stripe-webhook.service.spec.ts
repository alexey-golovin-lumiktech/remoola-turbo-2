import { type default as express } from 'express';

import { $Enums, Prisma } from '@remoola/database-2';

import { createOutcomeIdempotent } from './ledger-outcome-idempotent';
import { StripeWebhookService } from './stripe-webhook.service';

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
