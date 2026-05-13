import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

import { AdminV2PaymentReversalService } from './admin-v2-payment-reversal.service';
import { BalanceCalculationMode } from '../../shared/balance-calculation.service';
import {
  buildAdminPaymentReversalIdempotencyKey,
  buildStripeReversalLedgerIdempotencyKeys,
  calculateAlreadyReversedAmount,
  capExternalReversalAmount,
  deriveEffectivePaymentRequestStatus,
  resolveStrictReversalAmount,
} from '../../shared/payment-reversal-calculator';

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

describe(`AdminV2PaymentReversalService`, () => {
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

    const service = new AdminV2PaymentReversalService(prisma, mailingService, {} as any, {} as any, {} as any);

    await (service as any).sendReversalEmails({
      paymentRequestId: `pr-1`,
      payerId: `payer-1`,
      requesterId: `requester-1`,
      requesterEmail: `requester@example.com`,
      amount: 7,
      currencyCode: $Enums.CurrencyCode.USD,
      kind: `REFUND`,
      reason: `admin-reversal`,
    });

    expect(prisma.ledgerEntryModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          paymentRequestId: `pr-1`,
        }),
      }),
    );
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

  it(`does not remap legacy payment-link metadata to the canonical consumer app scope`, async () => {
    const prisma = {
      ledgerEntryModel: {
        findMany: jest.fn().mockResolvedValue([{ metadata: { consumerAppScope: `consumer-mobile` } }]),
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

    const service = new AdminV2PaymentReversalService(prisma, mailingService, {} as any, {} as any, {} as any);

    await (service as any).sendReversalEmails({
      paymentRequestId: `pr-1`,
      payerId: `payer-1`,
      requesterId: `requester-1`,
      requesterEmail: `requester@example.com`,
      amount: 7,
      currencyCode: $Enums.CurrencyCode.USD,
      kind: `REFUND`,
      reason: `admin-reversal`,
    });

    expect(mailingService.sendPaymentRefundEmail).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        recipientEmail: `payer@example.com`,
        consumerAppScope: undefined,
      }),
    );
    expect(mailingService.sendPaymentRefundEmail).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        recipientEmail: `requester@example.com`,
        consumerAppScope: undefined,
      }),
    );
  });

  it(`
      allows reversal when raw payment request status is stale
      but latest settlement outcome is completed
    `, async () => {
    const txExecuteRaw = jest.fn().mockResolvedValue(undefined);
    const txLedgerCreate = jest.fn().mockResolvedValue(undefined);
    const txLedgerFindMany = jest.fn().mockResolvedValue([]);
    const txLedgerFindFirst = jest.fn().mockResolvedValue(null);
    const txAdminAuditCreate = jest.fn().mockResolvedValue({ id: `audit-1` });
    const prisma = {
      paymentRequestModel: {
        findUnique: jest.fn().mockResolvedValue({
          id: `pr-stale-status`,
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
        }),
      },
      ledgerEntryModel: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ type: $Enums.LedgerEntryType.USER_DEPOSIT, ledgerId: `requester-ledger` }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      ledgerEntryOutcomeModel: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          $executeRaw: txExecuteRaw,
          ledgerEntryModel: {
            findMany: txLedgerFindMany,
            findFirst: txLedgerFindFirst,
            create: txLedgerCreate,
          },
          adminActionAuditLogModel: {
            create: txAdminAuditCreate,
          },
        }),
      ),
    } as any;
    const balanceService = {
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const adminActionAudit = {
      record: jest.fn().mockResolvedValue(undefined),
      recordRequired: jest.fn().mockResolvedValue(undefined),
      recordRequiredWithClient: jest.fn(async (tx, params) => tx.adminActionAuditLogModel.create({ data: params })),
    } as any;
    const service = new AdminV2PaymentReversalService(prisma, {} as any, balanceService, adminActionAudit, {} as any);
    jest.spyOn(service as any, `sendReversalEmails`).mockResolvedValue(undefined);

    await expect(
      service.createReversal(`pr-stale-status`, { kind: `CHARGEBACK`, amount: 25 }, `admin-1`),
    ).resolves.toEqual(
      expect.objectContaining({
        amount: 25,
        kind: `CHARGEBACK`,
      }),
    );
    expect(txLedgerCreate).toHaveBeenCalledTimes(2);
    expect(txAdminAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: `payment_chargeback`,
          resource: `payment_request`,
          resourceId: `pr-stale-status`,
        }),
      }),
    );
    expect(balanceService.calculateInTransaction).toHaveBeenCalledWith(
      expect.any(Object),
      `requester-1`,
      $Enums.CurrencyCode.USD,
      { mode: BalanceCalculationMode.COMPLETED_AND_PENDING },
    );
    expect(txExecuteRaw).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        values: [`pr-stale-status:payment-request-reversal`],
      }),
    );
    expect(txExecuteRaw).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        values: [`requester-1:outgoing`],
      }),
    );
  });

  it(`creates requester deposit reversal when original settlement was a deposit`, async () => {
    const txLedgerCreate = jest.fn().mockResolvedValue(undefined);
    const txLedgerFindMany = jest.fn().mockResolvedValue([]);
    const txLedgerFindFirst = jest.fn().mockResolvedValue(null);
    const txAdminAuditCreate = jest.fn().mockResolvedValue({ id: `audit-1` });
    const prisma = {
      paymentRequestModel: {
        findUnique: jest.fn().mockResolvedValue({
          id: `pr-reversal`,
          amount: 25,
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.COMPLETED,
          payerId: `payer-1`,
          requesterId: `requester-1`,
          requesterEmail: `requester@example.com`,
          ledgerEntries: [
            {
              ledgerId: `ledger-1`,
              type: $Enums.LedgerEntryType.USER_PAYMENT,
              status: $Enums.TransactionStatus.COMPLETED,
              outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
            },
          ],
        }),
      },
      ledgerEntryModel: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ type: $Enums.LedgerEntryType.USER_DEPOSIT, ledgerId: `settlement-ledger-1` }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      ledgerEntryOutcomeModel: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          $executeRaw: jest.fn().mockResolvedValue(undefined),
          ledgerEntryModel: {
            findMany: txLedgerFindMany,
            findFirst: txLedgerFindFirst,
            create: txLedgerCreate,
          },
          adminActionAuditLogModel: {
            create: txAdminAuditCreate,
          },
        }),
      ),
    } as any;
    const balanceService = {
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const adminActionAudit = {
      record: jest.fn().mockResolvedValue(undefined),
      recordRequired: jest.fn().mockResolvedValue(undefined),
      recordRequiredWithClient: jest.fn(async (tx, params) => tx.adminActionAuditLogModel.create({ data: params })),
    } as any;
    const service = new AdminV2PaymentReversalService(prisma, {} as any, balanceService, adminActionAudit, {} as any);
    jest.spyOn(service as any, `sendReversalEmails`).mockResolvedValue(undefined);

    await service.createReversal(`pr-reversal`, { kind: `CHARGEBACK`, amount: 25 }, `admin-1`);

    expect(txLedgerCreate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          consumerId: `payer-1`,
          type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
          amount: 25,
          metadata: expect.objectContaining({
            reversalOfLedgerId: `ledger-1`,
          }),
        }),
      }),
    );
    expect(txAdminAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: `payment_chargeback`,
          resource: `payment_request`,
          resourceId: `pr-reversal`,
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

  it(`uses completed stripe outcome externalId as payment intent fallback for admin refunds`, async () => {
    const refundsCreate = jest.fn().mockResolvedValue({ id: `re_123`, status: `succeeded` });
    const txLedgerCreate = jest.fn().mockResolvedValue(undefined);
    const txLedgerFindMany = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: `payer-reversal-entry` }, { id: `requester-reversal-entry` }]);
    const txLedgerFindFirst = jest.fn().mockResolvedValue(null);
    const txLedgerUpdateMany = jest.fn().mockResolvedValue({ count: 2 });
    const txOutcomeCreate = jest.fn().mockResolvedValue({ id: `outcome-1` });
    const txAdminAuditCreate = jest.fn().mockResolvedValue({ id: `audit-1` });
    const prisma = {
      paymentRequestModel: {
        findUnique: jest.fn().mockResolvedValue({
          id: `pr-refund`,
          amount: 25,
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.COMPLETED,
          payerId: `payer-1`,
          requesterId: `requester-1`,
          requesterEmail: `requester@example.com`,
          ledgerEntries: [
            {
              ledgerId: `payer-ledger`,
              type: $Enums.LedgerEntryType.USER_PAYMENT,
              status: $Enums.TransactionStatus.COMPLETED,
              outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
            },
          ],
        }),
      },
      ledgerEntryModel: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ type: $Enums.LedgerEntryType.USER_DEPOSIT, ledgerId: `requester-ledger` }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      ledgerEntryOutcomeModel: {
        findFirst: jest.fn().mockResolvedValue({ externalId: `pi_from_outcome` }),
      },
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          $executeRaw: jest.fn().mockResolvedValue(undefined),
          ledgerEntryModel: {
            findMany: txLedgerFindMany,
            findFirst: txLedgerFindFirst,
            create: txLedgerCreate,
            updateMany: txLedgerUpdateMany,
          },
          ledgerEntryOutcomeModel: {
            create: txOutcomeCreate,
          },
          adminActionAuditLogModel: {
            create: txAdminAuditCreate,
          },
        }),
      ),
    } as any;
    const balanceService = {
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const adminActionAudit = {
      record: jest.fn().mockResolvedValue(undefined),
      recordRequired: jest.fn().mockResolvedValue(undefined),
      recordRequiredWithClient: jest.fn(async (tx, params) => tx.adminActionAuditLogModel.create({ data: params })),
    } as any;
    const service = new AdminV2PaymentReversalService(prisma, {} as any, balanceService, adminActionAudit, {
      refunds: { create: refundsCreate },
    } as any);
    jest.spyOn(service as any, `sendReversalEmails`).mockResolvedValue(undefined);

    await service.createReversal(`pr-refund`, { kind: `REFUND`, amount: 25 }, `admin-1`);

    expect(refundsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_intent: `pi_from_outcome`,
        amount: 2500,
      }),
      expect.objectContaining({
        idempotencyKey: expect.stringContaining(`refund:`),
      }),
    );
    expect(adminActionAudit.recordRequiredWithClient.mock.invocationCallOrder[0]).toBeLessThan(
      refundsCreate.mock.invocationCallOrder[0],
    );
    expect(txLedgerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: $Enums.TransactionStatus.PENDING,
          stripeId: undefined,
        }),
      }),
    );
    expect(txLedgerUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stripeId: `re_123`,
          updatedBy: `admin-1`,
        }),
      }),
    );
    expect(txOutcomeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: $Enums.TransactionStatus.COMPLETED,
          source: `stripe`,
          externalId: `admin-refund:re_123:${$Enums.TransactionStatus.COMPLETED}`,
        }),
      }),
    );
    expect(txAdminAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: `payment_refund`,
          resource: `payment_request`,
          resourceId: `pr-refund`,
        }),
      }),
    );
  });

  it(`finalizes an existing pending refund reversal with a known Stripe refund id on retry`, async () => {
    const txExecuteRaw = jest.fn().mockResolvedValue(undefined);
    const txLedgerFindMany = jest
      .fn()
      .mockResolvedValueOnce([{ amount: 25, status: $Enums.TransactionStatus.PENDING, outcomes: [] }])
      .mockResolvedValueOnce([{ id: `payer-reversal` }, { id: `requester-reversal` }]);
    const txLedgerFindFirst = jest.fn().mockResolvedValue({
      id: `payer-reversal`,
      ledgerId: `ledger-existing`,
      amount: 25,
      stripeId: `re_existing`,
      status: $Enums.TransactionStatus.PENDING,
      outcomes: [],
    });
    const txLedgerUpdateMany = jest.fn().mockResolvedValue({ count: 2 });
    const txOutcomeCreate = jest.fn().mockResolvedValue({ id: `outcome-1` });
    const txAdminAuditCreate = jest.fn().mockResolvedValue({ id: `audit-1` });
    const refundsCreate = jest.fn();
    const refundsRetrieve = jest.fn().mockResolvedValue({ id: `re_existing`, status: `succeeded` });
    const prisma = {
      paymentRequestModel: {
        findUnique: jest.fn().mockResolvedValue({
          id: `pr-pending-retry`,
          amount: 25,
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.COMPLETED,
          payerId: `payer-1`,
          requesterId: `requester-1`,
          requesterEmail: `requester@example.com`,
          ledgerEntries: [
            {
              ledgerId: `payer-ledger`,
              type: $Enums.LedgerEntryType.USER_PAYMENT,
              status: $Enums.TransactionStatus.COMPLETED,
              createdAt: new Date(`2026-03-26T12:00:00.000Z`),
              outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
            },
          ],
        }),
      },
      ledgerEntryModel: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ stripeId: `pi_123` })
          .mockResolvedValueOnce({ type: $Enums.LedgerEntryType.USER_DEPOSIT, ledgerId: `requester-ledger` }),
      },
      ledgerEntryOutcomeModel: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          $executeRaw: txExecuteRaw,
          ledgerEntryModel: {
            findMany: txLedgerFindMany,
            findFirst: txLedgerFindFirst,
            updateMany: txLedgerUpdateMany,
            create: jest.fn(),
          },
          ledgerEntryOutcomeModel: {
            create: txOutcomeCreate,
          },
          adminActionAuditLogModel: {
            create: txAdminAuditCreate,
          },
        }),
      ),
    } as any;
    const adminActionAudit = {
      record: jest.fn().mockResolvedValue(undefined),
      recordRequired: jest.fn().mockResolvedValue(undefined),
      recordRequiredWithClient: jest.fn(async (tx, params) => tx.adminActionAuditLogModel.create({ data: params })),
    } as any;
    const service = new AdminV2PaymentReversalService(prisma, {} as any, {} as any, adminActionAudit, {
      refunds: { create: refundsCreate, retrieve: refundsRetrieve },
    } as any);
    jest.spyOn(service as any, `sendReversalEmails`).mockResolvedValue(undefined);

    await service.createReversal(`pr-pending-retry`, { kind: `REFUND`, amount: 25 }, `admin-2`);

    expect(refundsCreate).not.toHaveBeenCalled();
    expect(refundsRetrieve).toHaveBeenCalledWith(`re_existing`);
    expect(txLedgerUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stripeId: `re_existing`,
          updatedBy: `admin-2`,
        }),
      }),
    );
    expect(txOutcomeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: $Enums.TransactionStatus.COMPLETED,
          source: `stripe`,
          externalId: `admin-refund:re_existing:${$Enums.TransactionStatus.COMPLETED}`,
        }),
      }),
    );
    expect(adminActionAudit.recordRequired).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: `admin-2`,
        action: `payment_refund`,
        resourceId: `pr-pending-retry`,
        metadata: expect.objectContaining({
          replayedExistingReversal: true,
          stripeRefundId: `re_existing`,
        }),
      }),
    );
    expect(adminActionAudit.recordRequiredWithClient).not.toHaveBeenCalled();
    expect(txAdminAuditCreate).not.toHaveBeenCalled();
  });

  it(`retries an existing denied refund reversal without creating a duplicate ledger entry`, async () => {
    const txLedgerFindMany = jest
      .fn()
      .mockResolvedValueOnce([{ amount: 25, status: $Enums.TransactionStatus.DENIED, outcomes: [] }])
      .mockResolvedValueOnce([{ id: `payer-reversal` }, { id: `requester-reversal` }]);
    const txLedgerFindFirst = jest.fn().mockResolvedValue({
      id: `payer-reversal`,
      ledgerId: `ledger-denied`,
      amount: 25,
      stripeId: null,
      status: $Enums.TransactionStatus.DENIED,
      outcomes: [],
    });
    const txLedgerCreate = jest.fn();
    const txLedgerUpdateMany = jest.fn().mockResolvedValue({ count: 2 });
    const txOutcomeCreate = jest.fn().mockResolvedValue({ id: `outcome-1` });
    const refundsCreate = jest.fn().mockResolvedValue({ id: `re_retry`, status: `succeeded` });
    const prisma = {
      paymentRequestModel: {
        findUnique: jest.fn().mockResolvedValue({
          id: `pr-denied-retry`,
          amount: 25,
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.COMPLETED,
          payerId: `payer-1`,
          requesterId: `requester-1`,
          requesterEmail: `requester@example.com`,
          ledgerEntries: [
            {
              ledgerId: `payer-ledger`,
              type: $Enums.LedgerEntryType.USER_PAYMENT,
              status: $Enums.TransactionStatus.COMPLETED,
              createdAt: new Date(`2026-03-26T12:00:00.000Z`),
              outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
            },
          ],
        }),
      },
      ledgerEntryModel: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ stripeId: `pi_123` })
          .mockResolvedValueOnce({ type: $Enums.LedgerEntryType.USER_DEPOSIT, ledgerId: `requester-ledger` }),
      },
      ledgerEntryOutcomeModel: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          $executeRaw: jest.fn().mockResolvedValue(undefined),
          ledgerEntryModel: {
            findMany: txLedgerFindMany,
            findFirst: txLedgerFindFirst,
            create: txLedgerCreate,
            updateMany: txLedgerUpdateMany,
          },
          ledgerEntryOutcomeModel: {
            create: txOutcomeCreate,
          },
          adminActionAuditLogModel: {
            create: jest.fn(),
          },
        }),
      ),
    } as any;
    const adminActionAudit = {
      record: jest.fn().mockResolvedValue(undefined),
      recordRequired: jest.fn().mockResolvedValue(undefined),
      recordRequiredWithClient: jest.fn(),
    } as any;
    const service = new AdminV2PaymentReversalService(prisma, {} as any, {} as any, adminActionAudit, {
      refunds: { create: refundsCreate },
    } as any);
    jest.spyOn(service as any, `sendReversalEmails`).mockResolvedValue(undefined);

    await service.createReversal(`pr-denied-retry`, { kind: `REFUND`, amount: 25 }, `admin-3`);

    expect(txLedgerCreate).not.toHaveBeenCalled();
    expect(refundsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_intent: `pi_123`,
        amount: 2500,
      }),
      expect.objectContaining({
        idempotencyKey: expect.stringContaining(`refund:`),
      }),
    );
    expect(txLedgerUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stripeId: `re_retry`,
        }),
      }),
    );
    expect(txOutcomeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: $Enums.TransactionStatus.COMPLETED,
          externalId: `admin-refund:re_retry:${$Enums.TransactionStatus.COMPLETED}`,
        }),
      }),
    );
    expect(adminActionAudit.recordRequired).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: `admin-3`,
        action: `payment_refund`,
        resourceId: `pr-denied-retry`,
        metadata: expect.objectContaining({
          replayedExistingReversal: true,
          stripeRefundId: `re_retry`,
        }),
      }),
    );
  });

  const duplicateRefundIdempotencyCase = [
    `reuses the same business idempotency key for duplicate refunds`,
    `when admin changes but request shape stays the same`,
  ].join(` `);

  it(duplicateRefundIdempotencyCase, async () => {
    const txExecuteRaw = jest.fn().mockResolvedValue(undefined);
    const txLedgerFindMany = jest
      .fn()
      .mockResolvedValue([{ amount: 25, status: $Enums.TransactionStatus.COMPLETED, outcomes: [] }]);
    const txLedgerFindFirst = jest.fn().mockResolvedValue({
      id: `existing-entry`,
      ledgerId: `existing-ledger`,
      amount: 25,
      status: $Enums.TransactionStatus.COMPLETED,
      outcomes: [],
    });
    const txAdminAuditCreate = jest.fn().mockResolvedValue({ id: `audit-1` });
    const prisma = {
      paymentRequestModel: {
        findUnique: jest.fn().mockResolvedValue({
          id: `pr-duplicate`,
          amount: 25,
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.COMPLETED,
          payerId: `payer-1`,
          requesterId: `requester-1`,
          requesterEmail: `requester@example.com`,
          ledgerEntries: [
            {
              ledgerId: `payer-ledger`,
              type: $Enums.LedgerEntryType.USER_PAYMENT,
              status: $Enums.TransactionStatus.COMPLETED,
              createdAt: new Date(`2026-03-26T12:00:00.000Z`),
              outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
            },
          ],
        }),
      },
      ledgerEntryModel: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ stripeId: `pi_123` })
          .mockResolvedValueOnce({ type: $Enums.LedgerEntryType.USER_DEPOSIT, ledgerId: `requester-ledger` }),
      },
      ledgerEntryOutcomeModel: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          $executeRaw: txExecuteRaw,
          ledgerEntryModel: {
            findMany: txLedgerFindMany,
            findFirst: txLedgerFindFirst,
            create: jest.fn(),
          },
          adminActionAuditLogModel: {
            create: txAdminAuditCreate,
          },
        }),
      ),
    } as any;
    const adminActionAudit = {
      record: jest.fn().mockResolvedValue(undefined),
      recordRequired: jest.fn().mockResolvedValue(undefined),
      recordRequiredWithClient: jest.fn(async (tx, params) => tx.adminActionAuditLogModel.create({ data: params })),
    } as any;
    const service = new AdminV2PaymentReversalService(prisma, {} as any, {} as any, adminActionAudit, {
      refunds: { create: jest.fn() },
    } as any);
    jest.spyOn(service as any, `sendReversalEmails`).mockResolvedValue(undefined);

    await service.createReversal(`pr-duplicate`, { kind: `REFUND`, amount: 25, reason: `same-reason` }, `admin-1`);
    await service.createReversal(`pr-duplicate`, { kind: `REFUND`, amount: 25, reason: `same-reason` }, `admin-2`);

    const firstWhere = txLedgerFindFirst.mock.calls[0][0] as { where: { idempotencyKey: string } };
    const secondWhere = txLedgerFindFirst.mock.calls[1][0] as { where: { idempotencyKey: string } };

    expect(firstWhere.where.idempotencyKey).toBe(secondWhere.where.idempotencyKey);
    expect(txExecuteRaw).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.arrayContaining([`pr-duplicate:payment-request-reversal`]),
      }),
    );
    expect(adminActionAudit.record).not.toHaveBeenCalled();
    expect(adminActionAudit.recordRequired).not.toHaveBeenCalled();
    expect(adminActionAudit.recordRequiredWithClient).not.toHaveBeenCalled();
    expect(txAdminAuditCreate).not.toHaveBeenCalled();
  });
});
