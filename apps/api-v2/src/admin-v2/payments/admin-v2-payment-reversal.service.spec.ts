import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

import { AdminV2PaymentReversalService } from './admin-v2-payment-reversal.service';

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
    const txLedgerCreate = jest.fn().mockResolvedValue(undefined);
    const txLedgerFindMany = jest.fn().mockResolvedValue([]);
    const txLedgerFindFirst = jest.fn().mockResolvedValue(null);
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
          $executeRaw: jest.fn().mockResolvedValue(undefined),
          ledgerEntryModel: {
            findMany: txLedgerFindMany,
            findFirst: txLedgerFindFirst,
            create: txLedgerCreate,
          },
        }),
      ),
    } as any;
    const balanceService = {
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const adminActionAudit = {
      record: jest.fn().mockResolvedValue(undefined),
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
  });

  it(`creates requester deposit reversal when original settlement was a deposit`, async () => {
    const txLedgerCreate = jest.fn().mockResolvedValue(undefined);
    const txLedgerFindMany = jest.fn().mockResolvedValue([]);
    const txLedgerFindFirst = jest.fn().mockResolvedValue(null);
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
        }),
      ),
    } as any;
    const balanceService = {
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const adminActionAudit = {
      record: jest.fn().mockResolvedValue(undefined),
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
    const txLedgerFindMany = jest.fn().mockResolvedValue([]);
    const txLedgerFindFirst = jest.fn().mockResolvedValue(null);
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
          },
        }),
      ),
    } as any;
    const balanceService = {
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const adminActionAudit = {
      record: jest.fn().mockResolvedValue(undefined),
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
  });

  it(`reuses the same business idempotency key for duplicate refunds when admin changes but request shape stays the same`, async () => {
    const txExecuteRaw = jest.fn().mockResolvedValue(undefined);
    const txLedgerFindMany = jest.fn().mockResolvedValue([]);
    const txLedgerFindFirst = jest.fn().mockResolvedValue({ ledgerId: `existing-ledger`, amount: 25 });
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
        }),
      ),
    } as any;
    const adminActionAudit = {
      record: jest.fn().mockResolvedValue(undefined),
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
        values: expect.arrayContaining([`pr-duplicate`]),
      }),
    );
    expect(adminActionAudit.record).not.toHaveBeenCalled();
  });
});
