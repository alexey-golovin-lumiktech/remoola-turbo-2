import { $Enums } from '@remoola/database-2';

import { ConsumerPaymentsService } from './consumer-payments.service';

describe(`ConsumerPaymentsService regression coverage`, () => {
  const consumerId = `consumer-1`;
  const consumerEmail = `requester@example.com`;

  function createBalanceService() {
    return {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
  }

  it(`includes email-only requester access in the default payment list scope`, async () => {
    const prisma = {
      consumerModel: {
        findUnique: jest.fn().mockResolvedValue({ email: consumerEmail }),
      },
      paymentRequestModel: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: `pr-requester-email-only`,
            amount: 18,
            currencyCode: $Enums.CurrencyCode.USD,
            status: $Enums.TransactionStatus.PENDING,
            type: null,
            description: `email-only requester`,
            createdAt: new Date(`2026-03-31T10:00:00.000Z`),
            payerId: `payer-1`,
            payerEmail: `payer@example.com`,
            payer: { id: `payer-1`, email: `payer@example.com` },
            requesterId: null,
            requesterEmail: consumerEmail,
            requester: null,
            ledgerEntries: [],
          },
        ]),
      },
    } as any;

    const service = new ConsumerPaymentsService(prisma, {} as any, createBalanceService());
    const result = await service.listPayments({ consumerId, page: 1, pageSize: 20 });

    expect(result.total).toBe(1);
    expect(result.items[0]?.role).toBe(`REQUESTER`);
    expect(prisma.paymentRequestModel.count).toHaveBeenCalledWith({
      where: {
        OR: [
          { payerId: consumerId },
          { payerId: null, payerEmail: { equals: consumerEmail, mode: `insensitive` } },
          { requesterId: consumerId },
          { requesterId: null, requesterEmail: { equals: consumerEmail, mode: `insensitive` } },
        ],
      },
    });
  });

  it(`allows payment detail access for an email-only requester`, async () => {
    const prisma = {
      consumerModel: {
        findUnique: jest.fn().mockResolvedValue({ email: consumerEmail }),
      },
      paymentRequestModel: {
        findUnique: jest.fn().mockResolvedValue({
          id: `pr-email-only-requester`,
          payerId: `payer-1`,
          payerEmail: `payer@example.com`,
          requesterId: null,
          requesterEmail: `REQUESTER@example.com`,
          amount: 9.5,
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.PENDING,
          description: null,
          dueDate: null,
          sentDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          payer: { id: `payer-1`, email: `payer@example.com` },
          requester: null,
          attachments: [],
          ledgerEntries: [],
        }),
      },
    } as any;

    const service = new ConsumerPaymentsService(prisma, {} as any, createBalanceService());
    const result = await service.getPaymentView(consumerId, `pr-email-only-requester`);

    expect(result.role).toBe(`REQUESTER`);
    expect(result.requester.email).toBe(`REQUESTER@example.com`);
  });

  it(`hides invoice attachments from the non-generating counterparty`, async () => {
    const prisma = {
      consumerModel: {
        findUnique: jest.fn().mockResolvedValue({ email: `payer@example.com` }),
      },
      paymentRequestModel: {
        findUnique: jest.fn().mockResolvedValue({
          id: `payment-1`,
          payerId: consumerId,
          payerEmail: `payer@example.com`,
          requesterId: `requester-1`,
          requesterEmail: `requester@example.com`,
          amount: 9.5,
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.PENDING,
          description: null,
          dueDate: null,
          sentDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          payer: { id: consumerId, email: `payer@example.com` },
          requester: { id: `requester-1`, email: `requester@example.com` },
          attachments: [
            {
              requesterId: `requester-1`,
              resource: {
                id: `invoice-resource`,
                originalName: `INV-PENDING-12345678.pdf`,
                size: 1234,
                createdAt: new Date(),
                resourceTags: [{ tag: { name: `INVOICE-PENDING` } }],
              },
            },
            {
              requesterId: `requester-1`,
              resource: {
                id: `shared-resource`,
                originalName: `supporting-doc.pdf`,
                size: 4321,
                createdAt: new Date(),
                resourceTags: [],
              },
            },
          ],
          ledgerEntries: [],
        }),
      },
    } as any;

    const service = new ConsumerPaymentsService(prisma, {} as any, createBalanceService());
    const result = await service.getPaymentView(consumerId, `payment-1`, `http://localhost:3334`);

    expect(result.attachments).toEqual([
      expect.objectContaining({
        id: `shared-resource`,
        name: `supporting-doc.pdf`,
      }),
    ]);
  });

  it(
    `uses exact DB-backed ids and totals for raw waiting-recipient-approval ` +
      `pagination without leaking the raw status`,
    async () => {
      const paymentRow = {
        id: `pr-2501`,
        amount: 42,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.PENDING,
        type: $Enums.TransactionType.BANK_TRANSFER,
        description: `late-page waiting payment`,
        createdAt: new Date(`2026-03-31T11:00:00.000Z`),
        payerId: consumerId,
        payerEmail: consumerEmail,
        payer: { id: consumerId, email: consumerEmail },
        requesterId: `requester-1`,
        requesterEmail: `requester-1@example.com`,
        requester: { id: `requester-1`, email: `requester-1@example.com` },
        ledgerEntries: [
          {
            id: `entry-2501`,
            consumerId,
            createdAt: new Date(`2026-03-31T11:00:00.000Z`),
            status: $Enums.TransactionStatus.PENDING,
            outcomes: [{ status: $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL }],
          },
        ],
      };
      const prisma = {
        consumerModel: {
          findUnique: jest.fn().mockResolvedValue({ email: consumerEmail }),
        },
        $queryRaw: jest.fn().mockImplementation((query: { strings?: string[] }) => {
          const sql = query?.strings?.join(` `) ?? ``;
          if (sql.includes(`COUNT(*)::int AS total`)) {
            return Promise.resolve([{ total: 2501 }]);
          }
          if (sql.includes(`SELECT id`)) {
            return Promise.resolve([{ id: `pr-2501` }]);
          }
          return Promise.resolve([]);
        }),
        paymentRequestModel: {
          findMany: jest.fn().mockResolvedValue([paymentRow]),
        },
      } as any;

      const service = new ConsumerPaymentsService(prisma, {} as any, createBalanceService());
      const result = await service.listPayments({
        consumerId,
        page: 126,
        pageSize: 20,
        status: $Enums.TransactionStatus.WAITING,
      });

      expect(result.total).toBe(2501);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.id).toBe(`pr-2501`);
      expect(result.items[0]?.status).toBe($Enums.TransactionStatus.WAITING);
      expect(result.items[0]?.latestTransaction?.status).toBe($Enums.TransactionStatus.WAITING);
      expect(prisma.paymentRequestModel.findMany).toHaveBeenCalledWith({
        where: { id: { in: [`pr-2501`] } },
        include: expect.any(Object),
      });
    },
  );

  it(`collapses payment history to latest DB rows before paginating`, async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          id: `entry-history-1`,
          ledgerId: `ledger-history-1`,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
          effectiveStatus: $Enums.TransactionStatus.COMPLETED,
          amount: -25,
          currencyCode: $Enums.CurrencyCode.USD,
          createdAt: new Date(`2026-03-31T12:00:00.000Z`),
          metadata: { paymentMethodId: `pm-1` },
          paymentRequestId: `pr-1`,
          paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
          totalRows: 301,
        },
      ]),
      paymentMethodModel: {
        findMany: jest.fn().mockResolvedValue([{ id: `pm-1`, brand: `History Bank`, last4: `1234` }]),
      },
    } as any;

    const service = new ConsumerPaymentsService(prisma, {} as any, createBalanceService());
    const result = await service.getHistory(consumerId, {
      limit: 20,
      offset: 280,
      status: $Enums.TransactionStatus.COMPLETED,
    });

    expect(result.total).toBe(301);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        ledgerId: `ledger-history-1`,
        status: $Enums.TransactionStatus.COMPLETED,
        paymentMethodLabel: `History Bank •••• 1234`,
      }),
    );
  });

  it(`normalizes raw waiting-recipient-approval history rows for consumers`, async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          id: `entry-history-waiting`,
          ledgerId: `ledger-history-waiting`,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
          effectiveStatus: $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
          amount: -25,
          currencyCode: $Enums.CurrencyCode.USD,
          createdAt: new Date(`2026-03-31T12:00:00.000Z`),
          metadata: null,
          paymentRequestId: `pr-waiting`,
          paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
          totalRows: 1,
        },
      ]),
      paymentMethodModel: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as any;

    const service = new ConsumerPaymentsService(prisma, {} as any, createBalanceService());
    const result = await service.getHistory(consumerId, {
      limit: 20,
      offset: 0,
      status: $Enums.TransactionStatus.WAITING,
    });

    expect(result.total).toBe(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        ledgerId: `ledger-history-waiting`,
        status: $Enums.TransactionStatus.WAITING,
      }),
    );
  });

  it(`filters DB-backed history by the normalized visible payment type`, async () => {
    const queryCalls: string[] = [];
    const prisma = {
      $queryRaw: jest.fn().mockImplementation((query: { strings?: string[] }) => {
        queryCalls.push(query?.strings?.join(` `) ?? ``);
        return Promise.resolve([
          {
            id: `entry-history-normalized`,
            ledgerId: `ledger-history-normalized`,
            type: $Enums.LedgerEntryType.USER_DEPOSIT,
            effectiveStatus: $Enums.TransactionStatus.COMPLETED,
            amount: -25,
            currencyCode: $Enums.CurrencyCode.USD,
            createdAt: new Date(`2026-03-31T12:00:00.000Z`),
            metadata: null,
            paymentRequestId: `pr-1`,
            paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
            totalRows: 1,
          },
        ]);
      }),
      paymentMethodModel: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as any;

    const service = new ConsumerPaymentsService(prisma, {} as any, createBalanceService());
    const result = await service.getHistory(consumerId, {
      limit: 20,
      offset: 0,
      type: $Enums.LedgerEntryType.USER_PAYMENT,
    });

    expect(result.items[0]?.type).toBe($Enums.LedgerEntryType.USER_PAYMENT);
    expect(queryCalls[0]).toContain(`"normalizedType"`);
    expect(queryCalls[0]).toContain(`le.payment_request_id IS NOT NULL`);
    expect(queryCalls[0]).toContain(`latest."normalizedType"`);
  });
});
