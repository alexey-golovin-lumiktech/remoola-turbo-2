import { BadRequestException, ConflictException } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { AdminV2PayoutsService } from './admin-v2-payouts.service';
import { envs } from '../../envs';

function buildService() {
  const ledgerEntryModel = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  };
  const paymentMethodModel = {
    findMany: jest.fn(),
  };
  const adminActionAuditLogModel = {
    findMany: jest.fn(),
    create: jest.fn(),
  };
  const payoutEscalationModel = {
    findUnique: jest.fn(),
    create: jest.fn(),
  };
  const ledgerEntryOutcomeModel = {
    findFirst: jest.fn(),
  };
  const queryRaw = jest.fn();
  const prisma = {
    ledgerEntryModel,
    paymentMethodModel,
    adminActionAuditLogModel,
    payoutEscalationModel,
    ledgerEntryOutcomeModel,
    $queryRaw: queryRaw,
    $transaction: jest.fn(async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        ...prisma,
        $queryRaw: queryRaw,
      }),
    ),
  };
  const idempotency = {
    execute: jest.fn(async ({ execute }: { execute: () => Promise<unknown> }) => execute()),
  };
  const assignmentsService = {
    getAssignmentContextForResource: jest.fn(async () => ({ current: null, history: [] })),
  };
  const service = new AdminV2PayoutsService(prisma as never, idempotency as never, assignmentsService as never);

  return {
    service,
    prisma,
    ledgerEntryModel,
    paymentMethodModel,
    adminActionAuditLogModel,
    payoutEscalationModel,
    ledgerEntryOutcomeModel,
    queryRaw,
    idempotency,
    assignmentsService,
  };
}

describe(`AdminV2PayoutsService`, () => {
  const originalHighValueThresholds = envs.ADMIN_V2_PAYOUT_HIGH_VALUE_THRESHOLDS;

  beforeEach(() => {
    envs.ADMIN_V2_PAYOUT_HIGH_VALUE_THRESHOLDS = ``;
  });

  afterAll(() => {
    envs.ADMIN_V2_PAYOUT_HIGH_VALUE_THRESHOLDS = originalHighValueThresholds;
  });

  it(`derives payout queue statuses and high-value overlay from ledger truth and configured thresholds`, async () => {
    envs.ADMIN_V2_PAYOUT_HIGH_VALUE_THRESHOLDS = JSON.stringify({
      USD: `100`,
      EUR: `80`,
    });

    const { service, ledgerEntryModel, paymentMethodModel } = buildService();
    ledgerEntryModel.findMany.mockResolvedValueOnce([
      {
        id: `payout-failed`,
        ledgerId: `ledger-1`,
        type: $Enums.LedgerEntryType.USER_PAYOUT,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.PENDING,
        amount: new Prisma.Decimal(`-48.00`),
        stripeId: `po_failed`,
        metadata: { paymentMethodId: `pm-1`, payoutReference: `ref-failed` },
        consumerId: `consumer-1`,
        paymentRequestId: null,
        createdAt: new Date(`2026-04-14T00:00:00.000Z`),
        updatedAt: new Date(`2026-04-14T08:00:00.000Z`),
        consumer: { email: `consumer@example.com` },
        payoutEscalation: null,
        outcomes: [
          {
            id: `outcome-failed`,
            status: $Enums.TransactionStatus.DENIED,
            externalId: `po_failed`,
            createdAt: new Date(`2026-04-14T08:00:00.000Z`),
          },
        ],
      },
      {
        id: `payout-stuck`,
        ledgerId: `ledger-2`,
        type: $Enums.LedgerEntryType.USER_PAYOUT,
        currencyCode: $Enums.CurrencyCode.EUR,
        status: $Enums.TransactionStatus.PENDING,
        amount: new Prisma.Decimal(`-90.00`),
        stripeId: `po_stuck`,
        metadata: { paymentMethodId: `pm-2` },
        consumerId: `consumer-2`,
        paymentRequestId: null,
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
        consumer: { email: `stuck@example.com` },
        payoutEscalation: { id: `esc-existing` },
        outcomes: [
          {
            id: `outcome-stuck`,
            status: $Enums.TransactionStatus.PENDING,
            externalId: `po_stuck`,
            createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
          },
        ],
      },
      {
        id: `payout-high`,
        ledgerId: `ledger-3`,
        type: $Enums.LedgerEntryType.USER_PAYOUT,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.COMPLETED,
        amount: new Prisma.Decimal(`-150.00`),
        stripeId: `po_high`,
        metadata: null,
        consumerId: `consumer-3`,
        paymentRequestId: null,
        createdAt: new Date(`2026-04-15T00:00:00.000Z`),
        updatedAt: new Date(`2026-04-15T01:00:00.000Z`),
        consumer: { email: `high@example.com` },
        payoutEscalation: null,
        outcomes: [],
      },
      {
        id: `payout-no-threshold`,
        ledgerId: `ledger-4`,
        type: $Enums.LedgerEntryType.USER_PAYOUT_REVERSAL,
        currencyCode: $Enums.CurrencyCode.JPY,
        status: $Enums.TransactionStatus.COMPLETED,
        amount: new Prisma.Decimal(`1000.00`),
        stripeId: null,
        metadata: null,
        consumerId: `consumer-4`,
        paymentRequestId: null,
        createdAt: new Date(`2026-04-15T00:00:00.000Z`),
        updatedAt: new Date(`2026-04-15T01:00:00.000Z`),
        consumer: { email: `reversal@example.com` },
        payoutEscalation: null,
        outcomes: [],
      },
    ]);
    paymentMethodModel.findMany.mockResolvedValueOnce([
      {
        id: `pm-1`,
        consumerId: `consumer-1`,
        type: $Enums.PaymentMethodType.BANK_ACCOUNT,
        brand: null,
        last4: null,
        bankLast4: `5511`,
        deletedAt: null,
      },
      {
        id: `pm-2`,
        consumerId: `consumer-2`,
        type: $Enums.PaymentMethodType.BANK_ACCOUNT,
        brand: null,
        last4: null,
        bankLast4: `7744`,
        deletedAt: new Date(`2026-04-10T00:00:00.000Z`),
      },
    ]);

    const payouts = await service.listPayouts({ limit: 10 });

    expect(payouts.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: `payout-failed`,
          persistedStatus: `PENDING`,
          effectiveStatus: `DENIED`,
          derivedStatus: `failed`,
          highValue: expect.objectContaining({
            eligibility: `below-threshold`,
            thresholdAmount: `100`,
          }),
          destinationAvailability: `linked`,
        }),
        expect.objectContaining({
          id: `payout-stuck`,
          effectiveStatus: `PENDING`,
          derivedStatus: `stuck`,
          hasActiveEscalation: true,
          highValue: expect.objectContaining({
            eligibility: `high-value`,
            thresholdAmount: `80`,
          }),
        }),
        expect.objectContaining({
          id: `payout-high`,
          derivedStatus: `completed`,
          highValue: expect.objectContaining({
            eligibility: `high-value`,
            thresholdAmount: `100`,
          }),
        }),
        expect.objectContaining({
          id: `payout-no-threshold`,
          derivedStatus: `reversed`,
          highValue: expect.objectContaining({
            eligibility: `not-configured`,
            thresholdAmount: null,
          }),
        }),
      ]),
    );
    expect(payouts.highValuePolicy.availability).toBe(`configured`);
    expect(payouts.stuckPolicy.thresholdHours).toBe(24);
  });

  it(`never invents destination linkage when metadata lookup is absent or mismatched`, async () => {
    const { service, ledgerEntryModel, paymentMethodModel } = buildService();
    ledgerEntryModel.findMany.mockResolvedValueOnce([
      {
        id: `payout-no-link`,
        ledgerId: `ledger-1`,
        type: $Enums.LedgerEntryType.USER_PAYOUT,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.PENDING,
        amount: new Prisma.Decimal(`-10.00`),
        stripeId: null,
        metadata: { paymentMethodId: `pm-other-consumer` },
        consumerId: `consumer-1`,
        paymentRequestId: null,
        createdAt: new Date(`2026-04-15T00:00:00.000Z`),
        updatedAt: new Date(`2026-04-15T01:00:00.000Z`),
        consumer: { email: `owner@example.com` },
        payoutEscalation: null,
        outcomes: [
          { id: `outcome-1`, status: $Enums.TransactionStatus.WAITING, externalId: null, createdAt: new Date() },
        ],
      },
    ]);
    paymentMethodModel.findMany.mockResolvedValueOnce([
      {
        id: `pm-other-consumer`,
        consumerId: `consumer-2`,
        type: $Enums.PaymentMethodType.BANK_ACCOUNT,
        brand: null,
        last4: null,
        bankLast4: `9988`,
        deletedAt: null,
      },
    ]);

    const payouts = await service.listPayouts({ limit: 10 });

    expect(payouts.items[0]).toEqual(
      expect.objectContaining({
        id: `payout-no-link`,
        destinationAvailability: `unavailable`,
        destinationPaymentMethodSummary: null,
      }),
    );
  });

  it(`returns payout case with narrow escalation controls only for failed or stuck payouts`, async () => {
    envs.ADMIN_V2_PAYOUT_HIGH_VALUE_THRESHOLDS = JSON.stringify({ USD: `100` });

    const { service, ledgerEntryModel, paymentMethodModel, adminActionAuditLogModel } = buildService();
    ledgerEntryModel.findUnique.mockResolvedValueOnce({
      id: `payout-case`,
      ledgerId: `ledger-case`,
      type: $Enums.LedgerEntryType.USER_PAYOUT,
      currencyCode: $Enums.CurrencyCode.USD,
      status: $Enums.TransactionStatus.PENDING,
      amount: new Prisma.Decimal(`-120.00`),
      stripeId: `po_case`,
      metadata: { paymentMethodId: `pm-1`, payoutReference: `ref-case` },
      consumerId: `consumer-1`,
      paymentRequestId: `payment-1`,
      createdAt: new Date(`2026-04-14T00:00:00.000Z`),
      updatedAt: new Date(`2026-04-14T01:00:00.000Z`),
      consumer: { email: `consumer@example.com` },
      payoutEscalation: null,
      paymentRequest: {
        id: `payment-1`,
        amount: new Prisma.Decimal(`120.00`),
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.COMPLETED,
        paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
        payerId: `consumer-1`,
        payerEmail: `consumer@example.com`,
        requesterId: `consumer-2`,
        requesterEmail: `merchant@example.com`,
        payer: { email: `consumer@example.com` },
        requester: { email: `merchant@example.com` },
      },
      outcomes: [
        {
          id: `outcome-latest`,
          status: $Enums.TransactionStatus.DENIED,
          source: `stripe`,
          externalId: `po_case`,
          createdAt: new Date(`2026-04-14T03:00:00.000Z`),
        },
      ],
    });
    ledgerEntryModel.findMany.mockResolvedValueOnce([
      {
        id: `payout-case`,
        type: $Enums.LedgerEntryType.USER_PAYOUT,
        amount: new Prisma.Decimal(`-120.00`),
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.PENDING,
        createdAt: new Date(`2026-04-14T00:00:00.000Z`),
        outcomes: [{ status: $Enums.TransactionStatus.DENIED }],
      },
      {
        id: `payout-reversal`,
        type: $Enums.LedgerEntryType.USER_PAYOUT_REVERSAL,
        amount: new Prisma.Decimal(`120.00`),
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.COMPLETED,
        createdAt: new Date(`2026-04-15T00:00:00.000Z`),
        outcomes: [],
      },
    ]);
    paymentMethodModel.findMany.mockResolvedValueOnce([
      {
        id: `pm-1`,
        consumerId: `consumer-1`,
        type: $Enums.PaymentMethodType.BANK_ACCOUNT,
        brand: null,
        last4: null,
        bankLast4: `5511`,
        deletedAt: null,
      },
    ]);
    adminActionAuditLogModel.findMany.mockResolvedValueOnce([]);

    const payoutCase = await service.getPayoutCase(`payout-case`);

    expect(payoutCase.core.persistedStatus).toBe(`PENDING`);
    expect(payoutCase.core.effectiveStatus).toBe(`DENIED`);
    expect(payoutCase.core.derivedStatus).toBe(`failed`);
    expect(payoutCase.version).toBe(new Date(`2026-04-14T01:00:00.000Z`).getTime());
    expect(payoutCase.highValue).toEqual(
      expect.objectContaining({
        eligibility: `high-value`,
        thresholdAmount: `100`,
      }),
    );
    expect(payoutCase.actionControls).toEqual({
      canEscalate: true,
      allowedActions: [`payout_escalate`],
      escalateBlockedReason: null,
    });
    expect(payoutCase.assignment).toEqual({ current: null, history: [] });
  });

  it(`fetches operational assignment context for the payout case via the shared helper`, async () => {
    const { service, ledgerEntryModel, paymentMethodModel, adminActionAuditLogModel, assignmentsService } =
      buildService();
    const assignedAt = new Date(`2026-04-15T09:00:00.000Z`);
    assignmentsService.getAssignmentContextForResource.mockResolvedValueOnce({
      current: {
        id: `assignment-1`,
        assignedTo: { id: `admin-1`, name: null, email: `ops@example.com` },
        assignedBy: { id: `admin-1`, name: null, email: `ops@example.com` },
        assignedAt: assignedAt.toISOString(),
        reason: `Investigating failed payout`,
        expiresAt: null,
      },
      history: [
        {
          id: `assignment-1`,
          assignedTo: { id: `admin-1`, name: null, email: `ops@example.com` },
          assignedBy: { id: `admin-1`, name: null, email: `ops@example.com` },
          assignedAt: assignedAt.toISOString(),
          releasedAt: null,
          releasedBy: null,
          reason: `Investigating failed payout`,
          expiresAt: null,
        },
      ],
    });
    ledgerEntryModel.findUnique.mockResolvedValueOnce({
      id: `payout-case-with-assignment`,
      ledgerId: `ledger-case`,
      type: $Enums.LedgerEntryType.USER_PAYOUT,
      currencyCode: $Enums.CurrencyCode.USD,
      status: $Enums.TransactionStatus.PENDING,
      amount: new Prisma.Decimal(`-50.00`),
      stripeId: `po_assigned`,
      metadata: {},
      consumerId: `consumer-1`,
      paymentRequestId: null,
      createdAt: new Date(`2026-04-14T00:00:00.000Z`),
      updatedAt: new Date(`2026-04-14T01:00:00.000Z`),
      consumer: { email: `consumer@example.com` },
      payoutEscalation: null,
      paymentRequest: null,
      outcomes: [],
    });
    ledgerEntryModel.findMany.mockResolvedValueOnce([]);
    paymentMethodModel.findMany.mockResolvedValueOnce([]);
    adminActionAuditLogModel.findMany.mockResolvedValueOnce([]);

    const payoutCase = await service.getPayoutCase(`payout-case-with-assignment`);

    expect(assignmentsService.getAssignmentContextForResource).toHaveBeenCalledWith(
      `payout`,
      `payout-case-with-assignment`,
    );
    expect(payoutCase.assignment.current).toEqual(
      expect.objectContaining({
        id: `assignment-1`,
        assignedTo: expect.objectContaining({ id: `admin-1`, email: `ops@example.com` }),
        reason: `Investigating failed payout`,
      }),
    );
    expect(payoutCase.assignment.history).toHaveLength(1);
  });

  it(`requires explicit confirmation for payout escalation`, async () => {
    const { service } = buildService();

    await expect(
      service.escalatePayout(
        `payout-1`,
        `admin-1`,
        {
          confirmed: false,
          version: 1,
        },
        {
          idempotencyKey: `idem-1`,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it(`rejects payout escalation for statuses outside failed and stuck`, async () => {
    const { service, ledgerEntryModel, queryRaw, ledgerEntryOutcomeModel } = buildService();
    const updatedAt = new Date(`2026-04-16T09:00:00.000Z`);
    ledgerEntryModel.findUnique.mockResolvedValueOnce({
      id: `payout-1`,
      type: $Enums.LedgerEntryType.USER_PAYOUT,
      status: $Enums.TransactionStatus.PENDING,
      createdAt: new Date(`2026-04-16T08:00:00.000Z`),
      updatedAt,
      deletedAt: null,
      outcomes: [{ status: $Enums.TransactionStatus.COMPLETED, createdAt: new Date(`2026-04-16T08:30:00.000Z`) }],
    });
    queryRaw.mockResolvedValueOnce([
      {
        id: `payout-1`,
        type: $Enums.LedgerEntryType.USER_PAYOUT,
        status: $Enums.TransactionStatus.PENDING,
        consumer_id: `consumer-1`,
        payment_request_id: null,
        created_at: new Date(`2026-04-16T08:00:00.000Z`),
        updated_at: updatedAt,
        deleted_at: null,
      },
    ]);
    ledgerEntryOutcomeModel.findFirst.mockResolvedValueOnce({
      status: $Enums.TransactionStatus.COMPLETED,
      createdAt: new Date(`2026-04-16T08:30:00.000Z`),
      externalId: null,
    });

    await expect(
      service.escalatePayout(
        `payout-1`,
        `admin-1`,
        {
          confirmed: true,
          version: updatedAt.getTime(),
        },
        {
          idempotencyKey: `idem-2`,
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it(`creates a durable payout escalation record and audit entry`, async () => {
    const {
      service,
      ledgerEntryModel,
      queryRaw,
      ledgerEntryOutcomeModel,
      payoutEscalationModel,
      adminActionAuditLogModel,
      idempotency,
    } = buildService();
    const updatedAt = new Date(`2026-04-16T09:00:00.000Z`);
    ledgerEntryModel.findUnique.mockResolvedValueOnce({
      id: `payout-1`,
      type: $Enums.LedgerEntryType.USER_PAYOUT,
      status: $Enums.TransactionStatus.PENDING,
      createdAt: new Date(`2026-04-14T00:00:00.000Z`),
      updatedAt,
      deletedAt: null,
      outcomes: [{ status: $Enums.TransactionStatus.DENIED, createdAt: new Date(`2026-04-14T08:00:00.000Z`) }],
    });
    queryRaw.mockResolvedValueOnce([
      {
        id: `payout-1`,
        type: $Enums.LedgerEntryType.USER_PAYOUT,
        status: $Enums.TransactionStatus.PENDING,
        consumer_id: `consumer-1`,
        payment_request_id: `payment-1`,
        created_at: new Date(`2026-04-14T00:00:00.000Z`),
        updated_at: updatedAt,
        deleted_at: null,
      },
    ]);
    ledgerEntryOutcomeModel.findFirst.mockResolvedValueOnce({
      status: $Enums.TransactionStatus.DENIED,
      createdAt: new Date(`2026-04-14T08:00:00.000Z`),
      externalId: `po_failed`,
    });
    payoutEscalationModel.findUnique.mockResolvedValueOnce(null);
    payoutEscalationModel.create.mockResolvedValueOnce({
      id: `esc-1`,
      createdAt: new Date(`2026-04-16T10:00:00.000Z`),
      reason: `Ops handoff`,
    });

    const result = await service.escalatePayout(
      `payout-1`,
      `admin-1`,
      {
        confirmed: true,
        version: updatedAt.getTime(),
        reason: `Ops handoff`,
      },
      {
        ipAddress: `127.0.0.1`,
        userAgent: `jest`,
        idempotencyKey: `idem-3`,
      },
    );

    expect(idempotency.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: `admin-1`,
        scope: `payout-escalate:payout-1`,
        key: `idem-3`,
      }),
    );
    expect(payoutEscalationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ledgerEntryId: `payout-1`,
          escalatedBy: `admin-1`,
          confirmed: true,
          reason: `Ops handoff`,
        }),
      }),
    );
    expect(adminActionAuditLogModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: `payout_escalate`,
          resource: `payout`,
          resourceId: `payout-1`,
        }),
      }),
    );
    expect(result).toEqual({
      payoutId: `payout-1`,
      escalationId: `esc-1`,
      createdAt: `2026-04-16T10:00:00.000Z`,
      reason: `Ops handoff`,
      effectiveStatus: `DENIED`,
      derivedStatus: `failed`,
      version: updatedAt.getTime(),
      alreadyEscalated: false,
    });
  });

  it(`returns the existing escalation marker instead of duplicating it`, async () => {
    const {
      service,
      ledgerEntryModel,
      queryRaw,
      ledgerEntryOutcomeModel,
      payoutEscalationModel,
      adminActionAuditLogModel,
    } = buildService();
    const updatedAt = new Date(`2026-04-16T09:00:00.000Z`);
    ledgerEntryModel.findUnique.mockResolvedValueOnce({
      id: `payout-1`,
      type: $Enums.LedgerEntryType.USER_PAYOUT,
      status: $Enums.TransactionStatus.PENDING,
      createdAt: new Date(`2026-04-14T00:00:00.000Z`),
      updatedAt,
      deletedAt: null,
      outcomes: [{ status: $Enums.TransactionStatus.DENIED, createdAt: new Date(`2026-04-14T08:00:00.000Z`) }],
    });
    queryRaw.mockResolvedValueOnce([
      {
        id: `payout-1`,
        type: $Enums.LedgerEntryType.USER_PAYOUT,
        status: $Enums.TransactionStatus.PENDING,
        consumer_id: `consumer-1`,
        payment_request_id: null,
        created_at: new Date(`2026-04-14T00:00:00.000Z`),
        updated_at: updatedAt,
        deleted_at: null,
      },
    ]);
    ledgerEntryOutcomeModel.findFirst.mockResolvedValueOnce({
      status: $Enums.TransactionStatus.DENIED,
      createdAt: new Date(`2026-04-14T08:00:00.000Z`),
      externalId: `po_failed`,
    });
    payoutEscalationModel.findUnique.mockResolvedValueOnce({
      id: `esc-existing`,
      createdAt: new Date(`2026-04-16T10:00:00.000Z`),
      reason: `Existing escalation`,
    });

    const result = await service.escalatePayout(
      `payout-1`,
      `admin-1`,
      {
        confirmed: true,
        version: updatedAt.getTime(),
      },
      {
        idempotencyKey: `idem-4`,
      },
    );

    expect(adminActionAuditLogModel.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      payoutId: `payout-1`,
      escalationId: `esc-existing`,
      createdAt: `2026-04-16T10:00:00.000Z`,
      reason: `Existing escalation`,
      effectiveStatus: `DENIED`,
      derivedStatus: `failed`,
      version: updatedAt.getTime(),
      alreadyEscalated: true,
    });
  });
});
