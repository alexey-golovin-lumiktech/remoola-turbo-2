import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';

import { AdminV2PaymentReversalRefundFinalizerService } from './admin-v2-payment-reversal-refund-finalizer.service';
/* eslint-disable-next-line max-len */
import { type AdminV2PaymentReversalRefundOutboxRepository } from './admin-v2-payment-reversal-refund-outbox.repository';
import { type AdminV2PaymentReversalWorkflowService } from './admin-v2-payment-reversal-workflow.service';
import { type AdminV2PaymentReversalQuery } from './admin-v2-payment-reversal.query';
import { type AdminV2PaymentReversalRepository } from './admin-v2-payment-reversal.repository';
import { AdminV2PaymentReversalService } from './admin-v2-payment-reversal.service';
import { type AdminActionAuditService } from '../../shared/admin-action-audit.service';
import { type MailingService } from '../../shared/mailing.service';
import {
  buildAdminPaymentReversalIdempotencyKey,
  buildStripeReversalLedgerIdempotencyKeys,
  calculateAlreadyReversedAmount,
  capExternalReversalAmount,
  deriveEffectivePaymentRequestStatus,
  resolveStrictReversalAmount,
} from '../../shared/payment-reversal-calculator';
import { type PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';

describe(`PaymentReversalCalculator strict admin helpers`, () => {
  it(`caps reversals to the remaining amount after completed and pending reversal entries`, () => {
    const alreadyReversed = calculateAlreadyReversedAmount([
      { amount: 10, status: $Enums.TransactionStatus.COMPLETED },
      {
        amount: 5,
        status: $Enums.TransactionStatus.DENIED,
        outcomes: [{ status: $Enums.TransactionStatus.PENDING }],
      },
      { amount: 99, status: $Enums.TransactionStatus.DENIED },
      { amount: -4, status: $Enums.TransactionStatus.COMPLETED },
    ]);

    expect(alreadyReversed).toBe(15);
    expect(resolveStrictReversalAmount({ requestAmount: 20, alreadyReversed })).toEqual({
      ok: true,
      finalAmount: 5,
      remainingBefore: 5,
    });
    expect(resolveStrictReversalAmount({ requestAmount: 20, alreadyReversed, requestedAmount: 6 })).toEqual({
      ok: false,
      reason: `EXCEEDS_REMAINING_BALANCE`,
      remainingBefore: 5,
    });
    expect(capExternalReversalAmount({ requestAmount: 20, alreadyReversed, externalAmount: 6 })).toEqual({
      finalAmount: 5,
      remainingBefore: 5,
    });
  });

  it(`keeps reversal idempotency stable for semantically identical request shapes`, () => {
    expect(
      buildAdminPaymentReversalIdempotencyKey({
        paymentRequestId: `pr-1`,
        kind: `REFUND`,
        amount: 12.34,
        reason: ` admin reason `,
      }),
    ).toBe(
      buildAdminPaymentReversalIdempotencyKey({
        paymentRequestId: `pr-1`,
        kind: `REFUND`,
        amount: 12.34,
        reason: `admin reason`,
      }),
    );
    expect(
      buildAdminPaymentReversalIdempotencyKey({
        paymentRequestId: `pr-1`,
        kind: `REFUND`,
        amount: 12.34,
        reason: ``,
      }),
    ).toBe(
      buildAdminPaymentReversalIdempotencyKey({
        paymentRequestId: `pr-1`,
        kind: `REFUND`,
        amount: 12.34,
        reason: null,
      }),
    );
    expect(
      buildAdminPaymentReversalIdempotencyKey({
        paymentRequestId: `pr-1`,
        kind: `REFUND`,
        amount: 12.34,
      }),
    ).not.toBe(
      buildAdminPaymentReversalIdempotencyKey({
        paymentRequestId: `pr-1`,
        kind: `REFUND`,
        amount: 12.35,
      }),
    );
  });

  it(`keeps Stripe object idempotency keys object-scoped and role-scoped`, () => {
    expect(buildStripeReversalLedgerIdempotencyKeys({ kind: `REFUND`, stripeObjectId: `re_1` })).toEqual({
      payer: `reversal:refund:re_1:payer`,
      requester: `reversal:refund:re_1:requester`,
    });
    expect(buildStripeReversalLedgerIdempotencyKeys({ kind: `CHARGEBACK`, stripeObjectId: `dp_1` })).toEqual({
      payer: `reversal:chargeback:dp_1:payer`,
      requester: `reversal:chargeback:dp_1:requester`,
    });
    expect(buildStripeReversalLedgerIdempotencyKeys({ kind: `REFUND`, stripeObjectId: null })).toEqual({
      payer: undefined,
      requester: undefined,
    });
  });

  it(`uses the latest settlement ledger outcome as the effective payment request status`, () => {
    expect(
      deriveEffectivePaymentRequestStatus({
        status: $Enums.TransactionStatus.PENDING,
        ledgerEntries: [
          {
            status: $Enums.TransactionStatus.COMPLETED,
            createdAt: new Date(`2026-03-26T12:00:00.000Z`),
          },
          {
            status: $Enums.TransactionStatus.PENDING,
            createdAt: new Date(`2026-03-26T12:00:01.000Z`),
            outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
          },
        ],
      }),
    ).toBe($Enums.TransactionStatus.COMPLETED);
  });
});

type BuildServiceOptions = {
  query?: Partial<ReversalQueryMock>;
  workflow?: Partial<ReversalWorkflowMock>;
  repository?: Partial<ReversalRepositoryMock>;
  outboxRepository?: Partial<ReversalOutboxRepositoryMock>;
  mailingService?: Partial<ReversalMailingMock>;
  adminActionAudit?: Partial<ReversalAuditMock>;
  stripe?: {
    refunds?: Partial<ReversalStripeMock[`refunds`]>;
  };
};

type ReversalQueryMock = jest.Mocked<
  Pick<
    AdminV2PaymentReversalQuery,
    | `getPaymentRequestForReversal`
    | `resolveStripePaymentIntentId`
    | `getRequesterSettlementEntry`
    | `getNotificationContext`
  >
>;
type ReversalWorkflowMock = jest.Mocked<Pick<AdminV2PaymentReversalWorkflowService, `executeReversal`>>;
type ReversalRepositoryMock = jest.Mocked<
  Pick<AdminV2PaymentReversalRepository, `finalizeRefundReversal` | `markRefundReversalDenied`>
>;
type ReversalOutboxRepositoryMock = jest.Mocked<
  Pick<
    AdminV2PaymentReversalRefundOutboxRepository,
    `queuePending` | `markSentByIdempotencyKey` | `markFailedByIdempotencyKey` | `markDeadByIdempotencyKey`
  >
>;
type ReversalMailingMock = {
  sendPaymentRefundEmail: jest.Mock;
  sendPaymentChargebackEmail: jest.Mock;
};
type ReversalAuditMock = {
  recordRequired: jest.Mock;
};
type ReversalStripeMock = {
  refunds: {
    create: jest.Mock;
    retrieve: jest.Mock;
  };
};

function buildService(options: BuildServiceOptions = {}) {
  const query: ReversalQueryMock = {
    getPaymentRequestForReversal: jest.fn(),
    resolveStripePaymentIntentId: jest.fn(),
    getRequesterSettlementEntry: jest.fn(),
    getNotificationContext: jest.fn(),
    ...options.query,
  };
  const repository: ReversalRepositoryMock = {
    finalizeRefundReversal: jest.fn(),
    markRefundReversalDenied: jest.fn(),
    ...options.repository,
  };
  const outboxRepository: ReversalOutboxRepositoryMock = {
    queuePending: jest.fn().mockResolvedValue({ count: 1 }),
    markSentByIdempotencyKey: jest.fn().mockResolvedValue({ count: 1 }),
    markFailedByIdempotencyKey: jest.fn().mockResolvedValue({ count: 1 }),
    markDeadByIdempotencyKey: jest.fn().mockResolvedValue({ count: 1 }),
    ...options.outboxRepository,
  };
  const workflow: ReversalWorkflowMock = {
    executeReversal: jest.fn(),
    ...options.workflow,
  };
  const mailingService: ReversalMailingMock = {
    sendPaymentRefundEmail: jest.fn(),
    sendPaymentChargebackEmail: jest.fn(),
    ...options.mailingService,
  };
  const adminActionAudit: ReversalAuditMock = {
    recordRequired: jest.fn(),
    ...options.adminActionAudit,
  };
  const stripe: ReversalStripeMock = {
    refunds: {
      create: jest.fn(),
      retrieve: jest.fn(),
      ...options.stripe?.refunds,
    },
  };
  const tx = {} as Prisma.TransactionClient;
  const transactions: Pick<PrismaTransactionRunner, `run` | `runLedgerMutation`> = {
    run: <T>(callback: (client: Prisma.TransactionClient) => Promise<T>) => callback(tx),
    runLedgerMutation: <T>(callback: (client: Prisma.TransactionClient) => Promise<T>) => callback(tx),
  };

  const refundFinalizer = new AdminV2PaymentReversalRefundFinalizerService(
    repository as unknown as AdminV2PaymentReversalRepository,
    outboxRepository as unknown as AdminV2PaymentReversalRefundOutboxRepository,
    adminActionAudit as unknown as AdminActionAuditService,
    transactions as unknown as PrismaTransactionRunner,
    stripe,
  );
  const service = new AdminV2PaymentReversalService(
    query as unknown as AdminV2PaymentReversalQuery,
    workflow as unknown as AdminV2PaymentReversalWorkflowService,
    refundFinalizer,
    mailingService as unknown as MailingService,
  );

  return {
    service,
    query,
    workflow,
    repository,
    outboxRepository,
    mailingService,
    adminActionAudit,
    transactions,
    stripe,
    tx,
  };
}

describe(`AdminV2PaymentReversalService`, () => {
  const paymentRequest = {
    id: `pr-1`,
    amount: 25,
    currencyCode: $Enums.CurrencyCode.USD,
    status: $Enums.TransactionStatus.PENDING,
    payerId: `payer-1`,
    requesterId: `requester-1`,
    requesterEmail: `requester@example.com`,
    ledgerEntries: [
      {
        ledgerId: `payer-ledger`,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        status: $Enums.TransactionStatus.PENDING,
        createdAt: new Date(`2026-03-26T12:00:00.000Z`),
        outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
      },
      {
        ledgerId: `requester-ledger`,
        type: $Enums.LedgerEntryType.USER_DEPOSIT,
        status: $Enums.TransactionStatus.PENDING,
        createdAt: new Date(`2026-03-26T12:00:01.000Z`),
        outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
      },
    ],
  };

  it(`allows reversal for stale raw status with completed settlement outcome`, async () => {
    const { service, query, workflow, mailingService } = buildService({
      query: {
        getPaymentRequestForReversal: jest.fn().mockResolvedValue(paymentRequest),
        resolveStripePaymentIntentId: jest.fn().mockResolvedValue(null),
        getRequesterSettlementEntry: jest.fn().mockResolvedValue({
          type: $Enums.LedgerEntryType.USER_DEPOSIT,
          ledgerId: `requester-ledger`,
          paymentRequest: { paymentRail: $Enums.PaymentRail.CARD },
        }),
        getNotificationContext: jest.fn().mockResolvedValue({
          consumerAppScope: CURRENT_CONSUMER_APP_SCOPE,
          payerEmail: `payer@example.com`,
          requesterEmailResolved: `requester@example.com`,
        }),
      },
      workflow: {
        executeReversal: jest.fn().mockResolvedValue({
          ledgerId: `reversal-ledger`,
          amount: new Prisma.Decimal(25),
          remaining: new Prisma.Decimal(0),
          kind: `CHARGEBACK`,
          alreadyExisted: false,
        }),
      },
    });

    await expect(service.createReversal(`pr-1`, { kind: `CHARGEBACK`, amount: 25 }, `admin-1`)).resolves.toEqual({
      ledgerId: `reversal-ledger`,
      amount: 25,
      remaining: 0,
      kind: `CHARGEBACK`,
    });

    expect(workflow.executeReversal).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentRequestId: `pr-1`,
        requestAmount: new Prisma.Decimal(25),
        requestedAmount: new Prisma.Decimal(25),
        stripePaymentIntentId: null,
        originalLedgerId: `payer-ledger`,
        requesterReversalType: $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL,
      }),
    );
    expect(mailingService.sendPaymentChargebackEmail).toHaveBeenCalledTimes(2);
  });

  it(`creates a Stripe refund and finalizes the persisted reversal`, async () => {
    const { service, repository, stripe, mailingService, tx } = buildService({
      query: {
        getPaymentRequestForReversal: jest.fn().mockResolvedValue({
          ...paymentRequest,
          status: $Enums.TransactionStatus.COMPLETED,
        }),
        resolveStripePaymentIntentId: jest.fn().mockResolvedValue(`pi_123`),
        getRequesterSettlementEntry: jest.fn().mockResolvedValue({
          type: $Enums.LedgerEntryType.USER_DEPOSIT,
          ledgerId: `requester-ledger`,
          paymentRequest: { paymentRail: $Enums.PaymentRail.CARD },
        }),
        getNotificationContext: jest.fn().mockResolvedValue({
          consumerAppScope: CURRENT_CONSUMER_APP_SCOPE,
          payerEmail: `payer@example.com`,
          requesterEmailResolved: `requester@example.com`,
        }),
      },
      workflow: {
        executeReversal: jest.fn().mockResolvedValue({
          ledgerId: `ledger-created`,
          amount: new Prisma.Decimal(25),
          remaining: new Prisma.Decimal(0),
          kind: `REFUND`,
          alreadyExisted: false,
          idempotencyKeyBase: `base-1`,
          stripePaymentIntentId: `pi_123`,
        }),
      },
      stripe: {
        refunds: {
          create: jest.fn().mockResolvedValue({ id: `re_123`, status: `succeeded` }),
        },
      },
    });

    await service.createReversal(`pr-1`, { kind: `REFUND`, amount: 25, reason: `same-reason` }, `admin-1`);

    expect(stripe.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_intent: `pi_123`,
        amount: 2500,
        metadata: expect.objectContaining({
          paymentRequestId: `pr-1`,
          adminId: `admin-1`,
          idempotencyKeyBase: `base-1`,
        }),
      }),
      expect.objectContaining({
        idempotencyKey: `refund:base-1`,
      }),
    );
    expect(repository.finalizeRefundReversal).toHaveBeenCalledWith(tx, {
      ledgerId: `ledger-created`,
      adminId: `admin-1`,
      stripeRefundId: `re_123`,
      status: $Enums.TransactionStatus.COMPLETED,
    });
    expect(mailingService.sendPaymentRefundEmail).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        recipientEmail: `payer@example.com`,
        consumerAppScope: CURRENT_CONSUMER_APP_SCOPE,
      }),
    );
    expect(mailingService.sendPaymentRefundEmail).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        recipientEmail: `requester@example.com`,
        consumerAppScope: CURRENT_CONSUMER_APP_SCOPE,
      }),
    );
  });

  it(`marks the refund reversal denied when Stripe refund creation fails`, async () => {
    const stripeError = new Error(`stripe down`);
    const { service, repository, stripe, tx } = buildService({
      query: {
        getPaymentRequestForReversal: jest.fn().mockResolvedValue({
          ...paymentRequest,
          status: $Enums.TransactionStatus.COMPLETED,
        }),
        resolveStripePaymentIntentId: jest.fn().mockResolvedValue(`pi_123`),
        getRequesterSettlementEntry: jest.fn().mockResolvedValue({
          type: $Enums.LedgerEntryType.USER_DEPOSIT,
          ledgerId: `requester-ledger`,
          paymentRequest: { paymentRail: $Enums.PaymentRail.CARD },
        }),
      },
      workflow: {
        executeReversal: jest.fn().mockResolvedValue({
          ledgerId: `ledger-created`,
          amount: new Prisma.Decimal(25),
          remaining: new Prisma.Decimal(0),
          kind: `REFUND`,
          alreadyExisted: false,
          idempotencyKeyBase: `base-2`,
          stripePaymentIntentId: `pi_123`,
        }),
      },
      repository: {
        markRefundReversalDenied: jest.fn().mockResolvedValue(undefined),
      },
      stripe: {
        refunds: {
          create: jest.fn().mockRejectedValue(stripeError),
        },
      },
    });

    await expect(service.createReversal(`pr-1`, { kind: `REFUND`, amount: 25 }, `admin-1`)).rejects.toThrow(
      stripeError,
    );

    expect(repository.markRefundReversalDenied).toHaveBeenCalledWith(tx, {
      ledgerId: `ledger-created`,
      idempotencyKeyBase: `base-2`,
    });
  });

  it(`replays an existing refund reversal and finalizes it from the stored Stripe refund id`, async () => {
    const { service, repository, adminActionAudit, stripe, mailingService, tx } = buildService({
      query: {
        getPaymentRequestForReversal: jest.fn().mockResolvedValue({
          ...paymentRequest,
          status: $Enums.TransactionStatus.COMPLETED,
        }),
        resolveStripePaymentIntentId: jest.fn().mockResolvedValue(`pi_123`),
        getRequesterSettlementEntry: jest.fn().mockResolvedValue({
          type: $Enums.LedgerEntryType.USER_DEPOSIT,
          ledgerId: `requester-ledger`,
          paymentRequest: { paymentRail: $Enums.PaymentRail.CARD },
        }),
      },
      workflow: {
        executeReversal: jest.fn().mockResolvedValue({
          ledgerId: `ledger-existing`,
          amount: new Prisma.Decimal(25),
          remaining: new Prisma.Decimal(0),
          kind: `REFUND`,
          alreadyExisted: true,
          idempotencyKeyBase: `base-3`,
          stripePaymentIntentId: `pi_123`,
          existingStripeRefundId: `re_existing`,
          needsRefundFinalize: true,
        }),
      },
      stripe: {
        refunds: {
          retrieve: jest.fn().mockResolvedValue({ id: `re_existing`, status: `succeeded` }),
        },
      },
    });

    await service.createReversal(`pr-1`, { kind: `REFUND`, amount: 25, reason: `same-reason` }, `admin-2`);

    expect(stripe.refunds.retrieve).toHaveBeenCalledWith(`re_existing`);
    expect(adminActionAudit.recordRequired).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: `admin-2`,
        action: `payment_refund`,
        resourceId: `pr-1`,
        metadata: expect.objectContaining({
          replayedExistingReversal: true,
          stripeRefundId: `re_existing`,
        }),
      }),
    );
    expect(repository.finalizeRefundReversal).toHaveBeenCalledWith(tx, {
      ledgerId: `ledger-existing`,
      adminId: `admin-2`,
      stripeRefundId: `re_existing`,
      status: $Enums.TransactionStatus.COMPLETED,
    });
    expect(mailingService.sendPaymentRefundEmail).not.toHaveBeenCalled();
  });
});
