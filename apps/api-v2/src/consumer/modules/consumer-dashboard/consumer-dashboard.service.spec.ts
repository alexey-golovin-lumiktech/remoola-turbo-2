import { describe, expect, it, jest } from '@jest/globals';

import { $Enums } from '@remoola/database-2';

import { ConsumerDashboardService } from './consumer-dashboard.service';
import { BalanceCalculationMode } from '../../../shared/balance-calculation.service';

function mockResolved<T>(value: T) {
  return jest.fn<() => Promise<T>>().mockResolvedValue(value);
}

function mockResolvedSequence<T>(...values: T[]) {
  const mock = jest.fn<() => Promise<T>>();
  for (const value of values) {
    mock.mockResolvedValueOnce(value);
  }
  return mock;
}

describe(`ConsumerDashboardService`, () => {
  it(`excludes effectively completed requests from pending list and active summary`, async () => {
    const consumerId = `consumer-1`;
    const effectivelyCompletedRequest = {
      id: `pr-waiting`,
      requester: { email: `requester@example.com` },
      requesterEmail: `requester@example.com`,
      amount: 8.76,
      currencyCode: $Enums.CurrencyCode.EUR,
      status: $Enums.TransactionStatus.PENDING,
      updatedAt: new Date(`2026-03-25T17:27:00.000Z`),
      ledgerEntries: [
        {
          status: $Enums.TransactionStatus.PENDING,
          outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
        },
      ],
    };
    const prisma = {
      paymentRequestModel: {
        findMany: mockResolvedSequence([effectivelyCompletedRequest], [effectivelyCompletedRequest]),
      },
      ledgerEntryModel: {
        findFirst: mockResolved(null),
      },
      consumerSettingsModel: {
        findUnique: mockResolved(null),
      },
      consumerModel: {
        findUnique: mockResolved({
          personalDetails: null,
          paymentMethods: [],
          consumerResources: [],
        }),
      },
      consumerResourceModel: {
        findMany: mockResolved([]),
      },
    } as any;
    const balanceService = {
      calculateMultiCurrency: mockResolved({
        balances: { [$Enums.CurrencyCode.USD]: 0 },
      }),
    } as any;

    const service = new ConsumerDashboardService(prisma, balanceService);
    jest.spyOn(service as any, `buildActivity`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildTasks`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildQuickDocs`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildVerification`).mockResolvedValue({
      status: `pending_submission`,
      canStart: true,
      profileComplete: false,
      legalVerified: false,
      effectiveVerified: false,
      reviewStatus: `not_started`,
      stripeStatus: `not_started`,
      sessionId: null,
      lastErrorCode: null,
      lastErrorReason: null,
      startedAt: null,
      updatedAt: null,
      verifiedAt: null,
    });

    const result = await service.getDashboardData(consumerId);

    expect(result.summary.activeRequests).toBe(0);
    expect(result.pendingRequests).toEqual([]);
    expect(prisma.paymentRequestModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { OR: [{ payerId: consumerId }] },
            {
              OR: [
                { status: { not: $Enums.TransactionStatus.COMPLETED } },
                {
                  ledgerEntries: {
                    some: {
                      consumerId,
                      OR: [
                        { status: { not: $Enums.TransactionStatus.COMPLETED } },
                        { outcomes: { some: { status: { not: $Enums.TransactionStatus.COMPLETED } } } },
                      ],
                    },
                  },
                },
              ],
            },
          ],
        },
      }),
    );
    expect(balanceService.calculateMultiCurrency).toHaveBeenNthCalledWith(1, consumerId, {
      mode: BalanceCalculationMode.COMPLETED,
    });
    expect(balanceService.calculateMultiCurrency).toHaveBeenNthCalledWith(2, consumerId, {
      mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
    });
  });

  it(`derives settled and available summary
    balances from the preferred dashboard currency and returns cents`, async () => {
    const consumerId = `consumer-1`;
    const prisma = {
      paymentRequestModel: {
        findMany: mockResolved([]),
      },
      ledgerEntryModel: {
        findFirst: mockResolved({ createdAt: new Date(`2026-03-25T17:23:20.000Z`) }),
      },
      consumerSettingsModel: {
        findUnique: mockResolved({ preferredCurrency: $Enums.CurrencyCode.EUR }),
      },
      consumerModel: {
        findUnique: mockResolved({ email: `consumer@example.com` }),
      },
    } as any;
    const balanceService = {
      calculateMultiCurrency: mockResolvedSequence(
        {
          balances: { [$Enums.CurrencyCode.EUR]: -8.76 },
        },
        {
          balances: { [$Enums.CurrencyCode.EUR]: 12.34 },
        },
      ),
    } as any;

    const service = new ConsumerDashboardService(prisma, balanceService);
    jest.spyOn(service as any, `buildPendingRequests`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildActivity`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildTasks`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildQuickDocs`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildVerification`).mockResolvedValue({
      status: `pending_submission`,
      canStart: true,
      profileComplete: false,
      legalVerified: false,
      effectiveVerified: false,
      reviewStatus: `not_started`,
      stripeStatus: `not_started`,
      sessionId: null,
      lastErrorCode: null,
      lastErrorReason: null,
      startedAt: null,
      updatedAt: null,
      verifiedAt: null,
    });

    const result = await service.getDashboardData(consumerId);

    expect(result.summary.balanceCurrencyCode).toBe($Enums.CurrencyCode.EUR);
    expect(result.summary.balanceCents).toBe(-876);
    expect(result.summary.availableBalanceCurrencyCode).toBe($Enums.CurrencyCode.EUR);
    expect(result.summary.availableBalanceCents).toBe(1234);
    expect(balanceService.calculateMultiCurrency).toHaveBeenNthCalledWith(1, consumerId, {
      mode: BalanceCalculationMode.COMPLETED,
    });
    expect(balanceService.calculateMultiCurrency).toHaveBeenNthCalledWith(2, consumerId, {
      mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
    });
  });

  it(`falls back from preferred currency when it has no non-zero balances`, async () => {
    const consumerId = `consumer-preferred-zero`;
    const prisma = {
      paymentRequestModel: {
        findMany: mockResolved([]),
      },
      ledgerEntryModel: {
        findFirst: mockResolved({ createdAt: new Date(`2026-03-25T17:23:20.000Z`) }),
      },
      consumerSettingsModel: {
        findUnique: mockResolved({ preferredCurrency: $Enums.CurrencyCode.JPY }),
      },
      consumerModel: {
        findUnique: mockResolved({ email: `consumer@example.com` }),
      },
    } as any;
    const balanceService = {
      calculateMultiCurrency: mockResolvedSequence(
        {
          balances: {
            [$Enums.CurrencyCode.USD]: 23,
            [$Enums.CurrencyCode.EUR]: 10.66,
          },
        },
        {
          balances: {
            [$Enums.CurrencyCode.USD]: 16.77,
            [$Enums.CurrencyCode.EUR]: 10.66,
          },
        },
      ),
    } as any;

    const service = new ConsumerDashboardService(prisma, balanceService);
    jest.spyOn(service as any, `buildPendingRequests`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildActivity`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildTasks`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildQuickDocs`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildVerification`).mockResolvedValue({
      status: `pending_submission`,
      canStart: true,
      profileComplete: false,
      legalVerified: false,
      effectiveVerified: false,
      reviewStatus: `not_started`,
      stripeStatus: `not_started`,
      sessionId: null,
      lastErrorCode: null,
      lastErrorReason: null,
      startedAt: null,
      updatedAt: null,
      verifiedAt: null,
    });

    const result = await service.getDashboardData(consumerId);

    expect(result.summary.balanceCurrencyCode).toBe($Enums.CurrencyCode.USD);
    expect(result.summary.balanceCents).toBe(2300);
    expect(result.summary.availableBalanceCurrencyCode).toBe($Enums.CurrencyCode.USD);
    expect(result.summary.availableBalanceCents).toBe(1677);
  });

  it(`keeps active summary requests when raw payment request status is stale completed`, async () => {
    const consumerId = `consumer-2`;
    const prisma = {
      paymentRequestModel: {
        findMany: mockResolvedSequence(
          [
            {
              status: $Enums.TransactionStatus.COMPLETED,
              ledgerEntries: [
                {
                  status: $Enums.TransactionStatus.PENDING,
                  outcomes: [{ status: $Enums.TransactionStatus.WAITING }],
                },
              ],
            },
          ],
          [],
        ),
      },
      ledgerEntryModel: {
        findFirst: mockResolved(null),
        findMany: mockResolved([]),
      },
      consumerSettingsModel: {
        findUnique: mockResolved(null),
      },
      consumerModel: {
        findUnique: mockResolved({
          personalDetails: null,
          paymentMethods: [],
          consumerResources: [],
        }),
      },
      consumerResourceModel: {
        findMany: mockResolved([]),
      },
    } as any;
    const balanceService = {
      calculateMultiCurrency: mockResolved({ balances: {} }),
    } as any;

    const service = new ConsumerDashboardService(prisma, balanceService);
    const result = await service.getDashboardData(consumerId);

    expect(result.summary.activeRequests).toBe(1);
    expect(prisma.paymentRequestModel.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          AND: [
            { OR: [{ payerId: consumerId }] },
            {
              OR: [
                { status: { not: $Enums.TransactionStatus.COMPLETED } },
                {
                  ledgerEntries: {
                    some: {
                      consumerId,
                      OR: [
                        { status: { not: $Enums.TransactionStatus.COMPLETED } },
                        { outcomes: { some: { status: { not: $Enums.TransactionStatus.COMPLETED } } } },
                      ],
                    },
                  },
                },
              ],
            },
          ],
        },
      }),
    );
  });

  it(`keeps pending requests visible when raw payment request status is stale completed`, async () => {
    const consumerId = `consumer-3`;
    const staleCompletedRequest = {
      id: `pr-2`,
      requester: { email: `requester2@example.com` },
      requesterEmail: `requester2@example.com`,
      amount: 40,
      currencyCode: $Enums.CurrencyCode.USD,
      status: $Enums.TransactionStatus.COMPLETED,
      updatedAt: new Date(`2026-03-25T18:40:00.000Z`),
      ledgerEntries: [
        {
          status: $Enums.TransactionStatus.PENDING,
          outcomes: [{ status: $Enums.TransactionStatus.WAITING }],
        },
      ],
    };
    const prisma = {
      paymentRequestModel: {
        findMany: mockResolvedSequence([], [staleCompletedRequest]),
      },
      ledgerEntryModel: {
        findFirst: mockResolved(null),
        findMany: mockResolved([]),
      },
      consumerSettingsModel: {
        findUnique: mockResolved(null),
      },
      consumerModel: {
        findUnique: mockResolved({
          personalDetails: null,
          paymentMethods: [],
          consumerResources: [],
        }),
      },
      consumerResourceModel: {
        findMany: mockResolved([]),
      },
    } as any;
    const balanceService = {
      calculateMultiCurrency: mockResolved({ balances: {} }),
    } as any;

    const service = new ConsumerDashboardService(prisma, balanceService);
    const result = await service.getDashboardData(consumerId);

    expect(result.pendingRequests).toEqual([
      expect.objectContaining({
        id: `pr-2`,
        status: `Waiting for confirmation`,
      }),
    ]);
  });

  it(`includes email-only payer matches in active summary requests and open request cards`, async () => {
    const consumerId = `consumer-email-payer`;
    const consumerEmail = `payer@example.com`;
    const emailOnlyPayerRequest = {
      id: `pr-email-only`,
      requester: null,
      requesterEmail: `requester@example.com`,
      amount: 19.25,
      currencyCode: $Enums.CurrencyCode.USD,
      status: $Enums.TransactionStatus.PENDING,
      updatedAt: new Date(`2026-03-27T15:00:00.000Z`),
      ledgerEntries: [],
    };
    const prisma = {
      paymentRequestModel: {
        findMany: mockResolvedSequence([emailOnlyPayerRequest], [emailOnlyPayerRequest]),
      },
      ledgerEntryModel: {
        findFirst: mockResolved(null),
        findMany: mockResolved([]),
      },
      consumerSettingsModel: {
        findUnique: mockResolved(null),
      },
      consumerModel: {
        findUnique: mockResolved({ email: consumerEmail }),
      },
      consumerResourceModel: {
        findMany: mockResolved([]),
      },
    } as any;
    const balanceService = {
      calculateMultiCurrency: mockResolved({ balances: {} }),
    } as any;

    const service = new ConsumerDashboardService(prisma, balanceService);
    jest.spyOn(service as any, `buildActivity`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildTasks`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildQuickDocs`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildVerification`).mockResolvedValue({
      status: `pending_submission`,
      canStart: true,
      profileComplete: false,
      legalVerified: false,
      effectiveVerified: false,
      reviewStatus: `not_started`,
      stripeStatus: `not_started`,
      sessionId: null,
      lastErrorCode: null,
      lastErrorReason: null,
      startedAt: null,
      updatedAt: null,
      verifiedAt: null,
    });

    const result = await service.getDashboardData(consumerId);

    expect(result.summary.activeRequests).toBe(1);
    expect(result.pendingRequests).toEqual([
      expect.objectContaining({
        id: `pr-email-only`,
        counterpartyName: `requester@example.com`,
        status: `Pending`,
      }),
    ]);
    expect(prisma.paymentRequestModel.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { payerId: consumerId },
                { payerId: null, payerEmail: { equals: consumerEmail, mode: `insensitive` } },
              ],
            },
            expect.any(Object),
          ],
        },
      }),
    );
    expect(prisma.paymentRequestModel.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { payerId: consumerId },
                { payerId: null, payerEmail: { equals: consumerEmail, mode: `insensitive` } },
              ],
            },
            expect.any(Object),
          ],
        },
      }),
    );
  });

  it(`orders open payment requests by latest consumer-visible activity and formats status wording`, async () => {
    const consumerId = `consumer-dashboard-order`;
    const olderByUpdateButNewerByOutcome = {
      id: `pr-waiting`,
      requester: { email: `requester@example.com` },
      requesterEmail: `requester@example.com`,
      amount: 14.2,
      currencyCode: $Enums.CurrencyCode.USD,
      status: $Enums.TransactionStatus.PENDING,
      createdAt: new Date(`2026-03-27T12:13:35.558Z`),
      updatedAt: new Date(`2026-03-27T12:13:35.558Z`),
      ledgerEntries: [
        {
          createdAt: new Date(`2026-03-27T12:13:35.560Z`),
          status: $Enums.TransactionStatus.PENDING,
          outcomes: [
            {
              status: $Enums.TransactionStatus.WAITING,
              createdAt: new Date(`2026-03-27T12:50:00.000Z`),
            },
          ],
        },
      ],
    };
    const newerByUpdateOnly = {
      id: `pr-pending`,
      requester: { email: `known-start-payment@example.com` },
      requesterEmail: `known-start-payment@example.com`,
      amount: 27.54,
      currencyCode: $Enums.CurrencyCode.GBP,
      status: $Enums.TransactionStatus.PENDING,
      createdAt: new Date(`2026-03-27T12:42:30.616Z`),
      updatedAt: new Date(`2026-03-27T12:42:30.616Z`),
      ledgerEntries: [
        {
          createdAt: new Date(`2026-03-27T12:42:30.618Z`),
          status: $Enums.TransactionStatus.PENDING,
          outcomes: [{ status: $Enums.TransactionStatus.PENDING, createdAt: new Date(`2026-03-27T12:42:30.618Z`) }],
        },
      ],
    };
    const prisma = {
      paymentRequestModel: {
        findMany: mockResolvedSequence([], [olderByUpdateButNewerByOutcome, newerByUpdateOnly]),
      },
      ledgerEntryModel: {
        findFirst: mockResolved(null),
        findMany: mockResolved([]),
      },
      consumerSettingsModel: {
        findUnique: mockResolved(null),
      },
      consumerModel: {
        findUnique: mockResolved({
          personalDetails: null,
          paymentMethods: [],
          consumerResources: [],
        }),
      },
      consumerResourceModel: {
        findMany: mockResolved([]),
      },
    } as any;
    const balanceService = {
      calculateMultiCurrency: mockResolved({ balances: {} }),
    } as any;

    const service = new ConsumerDashboardService(prisma, balanceService);
    const result = await service.getDashboardData(consumerId);

    expect(result.pendingRequests).toEqual([
      expect.objectContaining({
        id: `pr-waiting`,
        counterpartyName: `requester@example.com`,
        status: `Waiting for confirmation`,
        lastActivityAt: olderByUpdateButNewerByOutcome.ledgerEntries[0].outcomes[0].createdAt,
      }),
      expect.objectContaining({
        id: `pr-pending`,
        counterpartyName: `known-start-payment@example.com`,
        status: `Pending`,
        lastActivityAt: newerByUpdateOnly.ledgerEntries[0].outcomes[0].createdAt,
      }),
    ]);
  });

  it(`narrows dormant WAITING_RECIPIENT_APPROVAL to generic waiting wording for consumers`, async () => {
    const consumerId = `consumer-dashboard-dormant-waiting`;
    const paymentRequest = {
      id: `pr-waiting-recipient-approval`,
      requester: { email: `requester@example.com` },
      requesterEmail: `requester@example.com`,
      amount: 12.34,
      currencyCode: $Enums.CurrencyCode.USD,
      status: $Enums.TransactionStatus.PENDING,
      createdAt: new Date(`2026-03-29T12:00:00.000Z`),
      updatedAt: new Date(`2026-03-29T12:00:00.000Z`),
      ledgerEntries: [
        {
          createdAt: new Date(`2026-03-29T12:00:01.000Z`),
          status: $Enums.TransactionStatus.PENDING,
          outcomes: [
            {
              status: $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
              createdAt: new Date(`2026-03-29T12:00:02.000Z`),
            },
          ],
        },
      ],
    };
    const prisma = {
      paymentRequestModel: {
        findMany: mockResolvedSequence([], [paymentRequest]),
      },
      ledgerEntryModel: {
        findFirst: mockResolved(null),
        findMany: mockResolved([]),
      },
      consumerSettingsModel: {
        findUnique: mockResolved(null),
      },
      consumerModel: {
        findUnique: mockResolved({
          personalDetails: null,
          paymentMethods: [],
          consumerResources: [],
        }),
      },
      consumerResourceModel: {
        findMany: mockResolved([]),
      },
    } as any;
    const balanceService = {
      calculateMultiCurrency: mockResolved({ balances: {} }),
    } as any;

    const service = new ConsumerDashboardService(prisma, balanceService);
    const result = await service.getDashboardData(consumerId);

    expect(result.pendingRequests).toEqual([
      expect.objectContaining({
        id: `pr-waiting-recipient-approval`,
        status: `Waiting for confirmation`,
        lastActivityAt: paymentRequest.ledgerEntries[0].outcomes[0].createdAt,
      }),
    ]);
  });

  it(`builds dashboard activity from mixed ledger history with user-facing labels`, async () => {
    const consumerId = `consumer-activity`;
    const prisma = {
      ledgerEntryModel: {
        findMany: mockResolved([
          {
            id: `exchange-usd`,
            ledgerId: `ledger-exchange`,
            type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
            status: $Enums.TransactionStatus.COMPLETED,
            amount: 1.06,
            currencyCode: $Enums.CurrencyCode.USD,
            createdAt: new Date(`2026-03-27T14:44:14.867Z`),
            metadata: { from: `EUR`, to: `USD`, rate: 1.0576 },
            paymentRequestId: null,
            outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
            paymentRequest: null,
          },
          {
            id: `withdrawal`,
            ledgerId: `ledger-withdrawal`,
            type: $Enums.LedgerEntryType.USER_PAYOUT,
            status: $Enums.TransactionStatus.PENDING,
            amount: -1,
            currencyCode: $Enums.CurrencyCode.USD,
            createdAt: new Date(`2026-03-27T14:37:49.778Z`),
            metadata: { paymentMethodId: `pm-bank-1`, rail: `BANK_TRANSFER` },
            paymentRequestId: null,
            outcomes: [{ status: $Enums.TransactionStatus.PENDING }],
            paymentRequest: null,
          },
          {
            id: `payment`,
            ledgerId: `ledger-payment`,
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            status: $Enums.TransactionStatus.PENDING,
            amount: -27.54,
            currencyCode: $Enums.CurrencyCode.GBP,
            createdAt: new Date(`2026-03-27T12:42:30.618Z`),
            metadata: { rail: `BANK_TRANSFER` },
            paymentRequestId: `payment-request-1`,
            outcomes: [{ status: $Enums.TransactionStatus.PENDING }],
            paymentRequest: { paymentRail: $Enums.PaymentRail.BANK_TRANSFER },
          },
        ]),
      },
      paymentMethodModel: {
        findMany: mockResolved([
          {
            id: `pm-bank-1`,
            brand: `Test Bank`,
            last4: `6789`,
          },
        ]),
      },
    } as any;
    const balanceService = {} as any;

    const service = new ConsumerDashboardService(prisma, balanceService);
    jest.spyOn(service as any, `buildSummary`).mockResolvedValue({
      balanceCents: 0,
      balanceCurrencyCode: $Enums.CurrencyCode.USD,
      availableBalanceCents: 0,
      availableBalanceCurrencyCode: $Enums.CurrencyCode.USD,
      activeRequests: 0,
      lastPaymentAt: null,
    });
    jest.spyOn(service as any, `buildPendingRequests`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildTasks`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildQuickDocs`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildVerification`).mockResolvedValue({
      status: `pending_submission`,
      canStart: true,
      profileComplete: false,
      legalVerified: false,
      effectiveVerified: false,
      reviewStatus: `not_started`,
      stripeStatus: `not_started`,
      sessionId: null,
      lastErrorCode: null,
      lastErrorReason: null,
      startedAt: null,
      updatedAt: null,
      verifiedAt: null,
    });

    const result = await service.getDashboardData(consumerId);

    expect(result.activity).toEqual([
      {
        id: `ledger-exchange`,
        label: `Exchange EUR to USD`,
        description: `Completed • 1.06 USD`,
        createdAt: `2026-03-27T14:44:14.867Z`,
        kind: `currency_exchange`,
      },
      {
        id: `ledger-withdrawal`,
        label: `Withdrawal`,
        description: `Pending • 1.00 USD • to Test Bank •••• 6789`,
        createdAt: `2026-03-27T14:37:49.778Z`,
        kind: `withdrawal`,
      },
      {
        id: `ledger-payment`,
        label: `Payment sent`,
        description: `Pending • 27.54 GBP • via bank transfer`,
        createdAt: `2026-03-27T12:42:30.618Z`,
        kind: `payment_sent`,
      },
    ]);
  });

  it(`treats W-9 filenames as completing the W-9 setup task`, async () => {
    const consumerId = `consumer-w9`;
    const prisma = {
      consumerModel: {
        findUnique: mockResolved({
          personalDetails: null,
          paymentMethods: [],
          consumerResources: [
            {
              resource: {
                originalName: `IRS-W-9.pdf`,
              },
            },
          ],
        }),
      },
    } as any;
    const balanceService = {} as any;

    const service = new ConsumerDashboardService(prisma, balanceService);
    const tasks = await (service as any).buildTasks(consumerId);

    expect(tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: `w9`,
          label: `Upload W-9 form`,
          completed: true,
        }),
      ]),
    );
  });
});
