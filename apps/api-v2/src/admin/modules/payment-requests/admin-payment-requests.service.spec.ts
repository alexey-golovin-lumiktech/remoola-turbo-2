import { $Enums } from '@remoola/database-2';

import { AdminPaymentRequestsService } from './admin-payment-requests.service';

describe(`AdminPaymentRequestsService`, () => {
  it(`routes reversal emails with the stored consumer app scope`, async () => {
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

    const service = new AdminPaymentRequestsService(prisma, mailingService, {} as any, {} as any);

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
        consumerAppScope: `consumer-mobile`,
      }),
    );
    expect(mailingService.sendPaymentRefundEmail).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        recipientEmail: `requester@example.com`,
        consumerAppScope: `consumer-mobile`,
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
          .mockResolvedValueOnce([{ metadata: { consumerAppScope: `consumer-mobile` } }]),
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

    const service = new AdminPaymentRequestsService(prisma, mailingService, {} as any, {} as any);

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
    expect(mailingService.sendPaymentRefundEmail).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        recipientEmail: `payer@example.com`,
        consumerAppScope: `consumer-mobile`,
      }),
    );
    expect(mailingService.sendPaymentRefundEmail).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        recipientEmail: `requester@example.com`,
        consumerAppScope: `consumer-mobile`,
      }),
    );
  });

  it(`derives list paymentRail from user payment ledger metadata when canonical field is null`, async () => {
    const prisma = {
      paymentRequestModel: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: `pr-1`,
            paymentRail: null,
            payer: { id: `payer-1`, email: `payer@example.com` },
            requester: { id: `requester-1`, email: `requester@example.com` },
            ledgerEntries: [
              {
                type: $Enums.LedgerEntryType.USER_PAYMENT,
                metadata: { rail: $Enums.PaymentRail.CARD },
              },
            ],
          },
        ]),
      },
    } as any;

    const service = new AdminPaymentRequestsService(prisma, {} as any, {} as any, {} as any);
    const result = await service.findAllPaymentRequests();

    expect(result.items[0]?.paymentRail).toBe($Enums.PaymentRail.CARD);
    expect(prisma.paymentRequestModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          ledgerEntries: expect.objectContaining({
            where: {
              type: {
                in: [$Enums.LedgerEntryType.USER_PAYMENT, $Enums.LedgerEntryType.USER_DEPOSIT],
              },
            },
          }),
        }),
      }),
    );
  });

  it(`derives detail paymentRail from user payment ledger metadata when canonical field is null`, async () => {
    const prisma = {
      paymentRequestModel: {
        findUnique: jest.fn().mockResolvedValue({
          id: `pr-2`,
          paymentRail: null,
          payer: { id: `payer-1`, email: `payer@example.com` },
          requester: { id: `requester-1`, email: `requester@example.com` },
          ledgerEntries: [
            {
              type: $Enums.LedgerEntryType.USER_PAYMENT,
              metadata: { rail: $Enums.PaymentRail.BANK_TRANSFER },
            },
          ],
        }),
      },
    } as any;

    const service = new AdminPaymentRequestsService(prisma, {} as any, {} as any, {} as any);
    const result = await service.getById(`pr-2`);

    expect(result?.paymentRail).toBe($Enums.PaymentRail.BANK_TRANSFER);
  });

  it(`derives detail paymentRail from user deposit ledger metadata when canonical field is null`, async () => {
    const prisma = {
      paymentRequestModel: {
        findUnique: jest.fn().mockResolvedValue({
          id: `pr-2b`,
          paymentRail: null,
          payer: { id: `payer-1`, email: `payer@example.com` },
          requester: { id: `requester-1`, email: `requester@example.com` },
          ledgerEntries: [
            {
              type: $Enums.LedgerEntryType.USER_DEPOSIT,
              metadata: { rail: $Enums.PaymentRail.CARD },
            },
          ],
        }),
      },
    } as any;

    const service = new AdminPaymentRequestsService(prisma, {} as any, {} as any, {} as any);
    const result = await service.getById(`pr-2b`);

    expect(result?.paymentRail).toBe($Enums.PaymentRail.CARD);
  });

  it(`derives detail status from effective user payment outcome when canonical status is stale`, async () => {
    const prisma = {
      paymentRequestModel: {
        findUnique: jest.fn().mockResolvedValue({
          id: `pr-3`,
          status: $Enums.TransactionStatus.PENDING,
          paymentRail: null,
          payer: { id: `payer-1`, email: `payer@example.com` },
          requester: { id: `requester-1`, email: `requester@example.com` },
          ledgerEntries: [
            {
              type: $Enums.LedgerEntryType.USER_PAYMENT,
              metadata: {},
              status: $Enums.TransactionStatus.PENDING,
              createdAt: new Date(`2026-03-25T17:23:00.000Z`),
              outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
            },
          ],
        }),
      },
    } as any;

    const service = new AdminPaymentRequestsService(prisma, {} as any, {} as any, {} as any);
    const result = await service.getById(`pr-3`);

    expect(result?.status).toBe($Enums.TransactionStatus.COMPLETED);
  });

  it(`derives detail status from effective user deposit outcome when canonical status is stale`, async () => {
    const prisma = {
      paymentRequestModel: {
        findUnique: jest.fn().mockResolvedValue({
          id: `pr-3b`,
          status: $Enums.TransactionStatus.PENDING,
          paymentRail: null,
          payer: { id: `payer-1`, email: `payer@example.com` },
          requester: { id: `requester-1`, email: `requester@example.com` },
          ledgerEntries: [
            {
              type: $Enums.LedgerEntryType.USER_DEPOSIT,
              metadata: {},
              status: $Enums.TransactionStatus.PENDING,
              createdAt: new Date(`2026-03-25T17:24:00.000Z`),
              outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
            },
          ],
        }),
      },
    } as any;

    const service = new AdminPaymentRequestsService(prisma, {} as any, {} as any, {} as any);
    const result = await service.getById(`pr-3b`);

    expect(result?.status).toBe($Enums.TransactionStatus.COMPLETED);
  });

  it(`filters list by effective status instead of raw payment request status`, async () => {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce([{ id: `pr-waiting` }]),
      paymentRequestModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `pr-waiting`,
            status: $Enums.TransactionStatus.PENDING,
            paymentRail: null,
            payer: { id: `payer-1`, email: `payer@example.com` },
            requester: { id: `requester-1`, email: `requester@example.com` },
            ledgerEntries: [
              {
                type: $Enums.LedgerEntryType.USER_PAYMENT,
                metadata: { rail: $Enums.PaymentRail.CARD },
                status: $Enums.TransactionStatus.PENDING,
                createdAt: new Date(`2026-03-25T17:23:00.000Z`),
                outcomes: [{ status: $Enums.TransactionStatus.WAITING }],
              },
            ],
          },
        ]),
      },
    } as any;

    const service = new AdminPaymentRequestsService(prisma, {} as any, {} as any, {} as any);
    const result = await service.findAllPaymentRequests({
      status: $Enums.TransactionStatus.WAITING,
      page: 1,
      pageSize: 20,
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.status).toBe($Enums.TransactionStatus.WAITING);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(prisma.paymentRequestModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: [`pr-waiting`] } } }),
    );
  });

  it(`uses db-backed totals and ids for effective-status pagination beyond 2000 rows`, async () => {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ total: 2501 }])
        .mockResolvedValueOnce([{ id: `pr-2501` }]),
      paymentRequestModel: {
        count: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          {
            id: `pr-2501`,
            status: $Enums.TransactionStatus.PENDING,
            paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
            payer: { id: `payer-1`, email: `payer@example.com` },
            requester: { id: `requester-1`, email: `requester@example.com` },
            ledgerEntries: [
              {
                type: $Enums.LedgerEntryType.USER_DEPOSIT,
                metadata: {},
                status: $Enums.TransactionStatus.PENDING,
                createdAt: new Date(`2026-03-26T10:00:00.000Z`),
                outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
              },
            ],
          },
        ]),
      },
    } as any;

    const service = new AdminPaymentRequestsService(prisma, {} as any, {} as any, {} as any);
    const result = await service.findAllPaymentRequests({
      status: $Enums.TransactionStatus.COMPLETED,
      page: 126,
      pageSize: 20,
    });

    expect(result.total).toBe(2501);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe(`pr-2501`);
    expect(result.items[0]?.status).toBe($Enums.TransactionStatus.COMPLETED);
    expect(prisma.paymentRequestModel.count).not.toHaveBeenCalled();
    expect(prisma.paymentRequestModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: [`pr-2501`] } },
      }),
    );
  });

  it(`allows reversal when raw payment request status is stale
    but latest settlement outcome is completed`, async () => {
    const txLedgerCreate = jest.fn().mockResolvedValue(undefined);
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
    const service = new AdminPaymentRequestsService(prisma, {} as any, balanceService, adminActionAudit);
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
    const service = new AdminPaymentRequestsService(prisma, {} as any, balanceService, adminActionAudit);
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

  const cardSettlementReversalCase = [
    `creates requester deposit reversal for card-funded settlements`,
    `without mutating the original ledger type`,
  ].join(` `);

  it(cardSettlementReversalCase, async () => {
    const txLedgerCreate = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      paymentRequestModel: {
        findUnique: jest.fn().mockResolvedValue({
          id: `pr-card-reversal`,
          amount: 25,
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.COMPLETED,
          paymentRail: $Enums.PaymentRail.CARD,
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
          .mockResolvedValueOnce({
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            ledgerId: `settlement-ledger-card`,
            paymentRequest: {
              paymentRail: $Enums.PaymentRail.CARD,
            },
          }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      ledgerEntryOutcomeModel: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          $executeRaw: jest.fn().mockResolvedValue(undefined),
          ledgerEntryModel: {
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
    const service = new AdminPaymentRequestsService(prisma, {} as any, balanceService, adminActionAudit);
    jest.spyOn(service as any, `sendReversalEmails`).mockResolvedValue(undefined);

    await service.createReversal(`pr-card-reversal`, { kind: `CHARGEBACK`, amount: 25 }, `admin-1`);

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

  it(`uses completed stripe outcome externalId as payment intent fallback for admin refunds`, async () => {
    const refundsCreate = jest.fn().mockResolvedValue({ id: `re_123`, status: `succeeded` });
    const txLedgerCreate = jest.fn().mockResolvedValue(undefined);
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
    const service = new AdminPaymentRequestsService(prisma, {} as any, balanceService, adminActionAudit);
    (service as unknown as { stripe: { refunds: { create: jest.Mock } } }).stripe = {
      refunds: { create: refundsCreate },
    } as any;
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
});
