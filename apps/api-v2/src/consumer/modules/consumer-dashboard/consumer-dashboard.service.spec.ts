import { describe, expect, it, jest } from '@jest/globals';

import { $Enums } from '@remoola/database-2';

import { type ConsumerDashboardQuery } from './consumer-dashboard.query';
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

function createDashboardQueryMock(
  overrides: Partial<Record<keyof ConsumerDashboardQuery, jest.Mock<(...a: any[]) => any>>> = {},
) {
  return {
    getConsumerEmail: mockResolved(null),
    findFinancialActivityRows: mockResolved([]),
    findPaymentMethodLabels: mockResolved([]),
    findSetupConsumer: mockResolved({
      personalDetails: null,
      paymentMethods: [],
      consumerResources: [],
    }),
    findActiveRequestCandidates: mockResolved([]),
    findLastPayment: mockResolved(null),
    findSettings: mockResolved(null),
    findPendingPaymentRequests: mockResolved([]),
    findVerificationConsumer: mockResolved({
      personalDetails: null,
    }),
    findQuickDocs: mockResolved([]),
    ...overrides,
  } as unknown as ConsumerDashboardQuery;
}

function createEmptySummary() {
  return {
    balanceCents: 0,
    balanceCurrencyCode: $Enums.CurrencyCode.USD,
    availableBalanceCents: 0,
    availableBalanceCurrencyCode: $Enums.CurrencyCode.USD,
    activeRequests: 0,
    lastPaymentAt: null,
  };
}

function createPendingVerificationState() {
  return {
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
  };
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
    const dashboardQuery = createDashboardQueryMock({
      findActiveRequestCandidates: mockResolved([effectivelyCompletedRequest]),
      findPendingPaymentRequests: mockResolved([effectivelyCompletedRequest]),
    });
    const balanceService = {
      calculateMultiCurrency: mockResolved({
        balances: { [$Enums.CurrencyCode.USD]: 0 },
      }),
    } as any;

    const service = new ConsumerDashboardService(dashboardQuery, balanceService);
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
    expect(dashboardQuery.findActiveRequestCandidates).toHaveBeenCalledWith(consumerId, null);
    expect(dashboardQuery.findPendingPaymentRequests).toHaveBeenCalledWith(consumerId, null);
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
    const dashboardQuery = createDashboardQueryMock({
      getConsumerEmail: mockResolved(`consumer@example.com`),
      findLastPayment: mockResolved({ createdAt: new Date(`2026-03-25T17:23:20.000Z`) }),
      findSettings: mockResolved({ preferredCurrency: $Enums.CurrencyCode.EUR }),
    });
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

    const service = new ConsumerDashboardService(dashboardQuery, balanceService);
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
    const dashboardQuery = createDashboardQueryMock({
      getConsumerEmail: mockResolved(`consumer@example.com`),
      findLastPayment: mockResolved({ createdAt: new Date(`2026-03-25T17:23:20.000Z`) }),
      findSettings: mockResolved({ preferredCurrency: $Enums.CurrencyCode.JPY }),
    });
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

    const service = new ConsumerDashboardService(dashboardQuery, balanceService);
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
    const activeRequestCandidate = {
      status: $Enums.TransactionStatus.COMPLETED,
      ledgerEntries: [
        {
          status: $Enums.TransactionStatus.PENDING,
          outcomes: [{ status: $Enums.TransactionStatus.WAITING }],
        },
      ],
    };
    const dashboardQuery = createDashboardQueryMock({
      findActiveRequestCandidates: mockResolved([activeRequestCandidate]),
    });
    const balanceService = {
      calculateMultiCurrency: mockResolved({ balances: {} }),
    } as any;

    const service = new ConsumerDashboardService(dashboardQuery, balanceService);
    const result = await service.getDashboardData(consumerId);

    expect(result.summary.activeRequests).toBe(1);
    expect(dashboardQuery.findActiveRequestCandidates).toHaveBeenCalledWith(consumerId, null);
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
    const dashboardQuery = createDashboardQueryMock({
      findPendingPaymentRequests: mockResolved([staleCompletedRequest]),
    });
    const balanceService = {
      calculateMultiCurrency: mockResolved({ balances: {} }),
    } as any;

    const service = new ConsumerDashboardService(dashboardQuery, balanceService);
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
    const dashboardQuery = createDashboardQueryMock({
      getConsumerEmail: mockResolved(consumerEmail),
      findActiveRequestCandidates: mockResolved([emailOnlyPayerRequest]),
      findPendingPaymentRequests: mockResolved([emailOnlyPayerRequest]),
    });
    const balanceService = {
      calculateMultiCurrency: mockResolved({ balances: {} }),
    } as any;

    const service = new ConsumerDashboardService(dashboardQuery, balanceService);
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
    expect(dashboardQuery.findActiveRequestCandidates).toHaveBeenCalledWith(consumerId, consumerEmail);
    expect(dashboardQuery.findPendingPaymentRequests).toHaveBeenCalledWith(consumerId, consumerEmail);
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
    const dashboardQuery = createDashboardQueryMock({
      findPendingPaymentRequests: mockResolved([olderByUpdateButNewerByOutcome, newerByUpdateOnly]),
    });
    const balanceService = {
      calculateMultiCurrency: mockResolved({ balances: {} }),
    } as any;

    const service = new ConsumerDashboardService(dashboardQuery, balanceService);
    const result = await service.getDashboardData(consumerId);

    expect(result.pendingRequests).toEqual([
      expect.objectContaining({
        id: `pr-waiting`,
        counterpartyName: `requester@example.com`,
        status: `Waiting for confirmation`,
        lastActivityAt: olderByUpdateButNewerByOutcome.ledgerEntries[0].outcomes[0].createdAt.toISOString(),
      }),
      expect.objectContaining({
        id: `pr-pending`,
        counterpartyName: `known-start-payment@example.com`,
        status: `Pending`,
        lastActivityAt: newerByUpdateOnly.ledgerEntries[0].outcomes[0].createdAt.toISOString(),
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
    const dashboardQuery = createDashboardQueryMock({
      findPendingPaymentRequests: mockResolved([paymentRequest]),
    });
    const balanceService = {
      calculateMultiCurrency: mockResolved({ balances: {} }),
    } as any;

    const service = new ConsumerDashboardService(dashboardQuery, balanceService);
    const result = await service.getDashboardData(consumerId);

    expect(result.pendingRequests).toEqual([
      expect.objectContaining({
        id: `pr-waiting-recipient-approval`,
        status: `Waiting for confirmation`,
        lastActivityAt: paymentRequest.ledgerEntries[0].outcomes[0].createdAt.toISOString(),
      }),
    ]);
  });

  it(`builds dashboard activity from mixed ledger history with user-facing labels`, async () => {
    const consumerId = `consumer-activity`;
    const dashboardQuery = createDashboardQueryMock({
      findFinancialActivityRows: mockResolved([
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
      findPaymentMethodLabels: mockResolved([
        {
          id: `pm-bank-1`,
          brand: `Test Bank`,
          last4: `6789`,
        },
      ]),
    });
    const balanceService = {} as any;

    const service = new ConsumerDashboardService(dashboardQuery, balanceService);
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
    const dashboardQuery = createDashboardQueryMock({
      findSetupConsumer: mockResolved({
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
    });
    const balanceService = {} as any;

    const service = new ConsumerDashboardService(dashboardQuery, balanceService);
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

  it(`falls back to setup activity with current timestamp defaults when financial activity is empty`, async () => {
    const consumerId = `consumer-setup-fallback`;
    const now = new Date(`2026-04-03T10:11:12.000Z`);
    jest.useFakeTimers().setSystemTime(now);

    try {
      const dashboardQuery = createDashboardQueryMock({
        findSetupConsumer: mockResolved({
          personalDetails: null,
          paymentMethods: [],
          consumerResources: [],
        }),
      });
      const balanceService = {
        calculateMultiCurrency: mockResolved({ balances: {} }),
      } as any;

      const service = new ConsumerDashboardService(dashboardQuery, balanceService);
      jest.spyOn(service as any, `buildSummary`).mockResolvedValue(createEmptySummary());
      jest.spyOn(service as any, `buildPendingRequests`).mockResolvedValue([]);
      jest.spyOn(service as any, `buildTasks`).mockResolvedValue([]);
      jest.spyOn(service as any, `buildQuickDocs`).mockResolvedValue([]);
      jest.spyOn(service as any, `buildVerification`).mockResolvedValue(createPendingVerificationState());

      const result = await service.getDashboardData(consumerId);

      expect(result.activity).toStrictEqual([
        {
          id: `kyc_pending`,
          label: `Identity verification pending`,
          createdAt: now.toISOString(),
          kind: `kyc_in_review`,
        },
        {
          id: `bank_pending`,
          label: `Bank details pending`,
          createdAt: now.toISOString(),
          kind: `bank_pending`,
        },
      ]);
      expect(dashboardQuery.findFinancialActivityRows).toHaveBeenCalledWith(consumerId);
      expect(dashboardQuery.findSetupConsumer).toHaveBeenCalledWith(consumerId);
    } finally {
      jest.useRealTimers();
    }
  });

  it(`preserves setup activity wording and task asymmetry for verified non-bank methods`, async () => {
    const consumerId = `consumer-setup-asymmetry`;
    const verifiedAt = new Date(`2026-04-03T15:00:00.000Z`);
    const w9CreatedAt = new Date(`2026-04-03T14:00:00.000Z`);
    const cardCreatedAt = new Date(`2026-04-03T13:00:00.000Z`);
    const dashboardQuery = createDashboardQueryMock({
      findSetupConsumer: mockResolved({
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.INDIVIDUAL,
        legalVerified: true,
        verificationStatus: $Enums.VerificationStatus.PENDING,
        stripeIdentityVerifiedAt: verifiedAt,
        personalDetails: {
          legalStatus: `SOLE_PROPRIETOR`,
          taxId: `12-3456789`,
          passportOrIdNumber: `P1234567`,
          phoneNumber: null,
        },
        paymentMethods: [
          {
            type: `CARD_ONLY`,
            createdAt: cardCreatedAt,
          },
        ],
        consumerResources: [
          {
            resource: {
              originalName: `IRS-W-9.pdf`,
              createdAt: w9CreatedAt,
            },
          },
        ],
      }),
    });
    const balanceService = {
      calculateMultiCurrency: mockResolved({ balances: {} }),
    } as any;

    const service = new ConsumerDashboardService(dashboardQuery, balanceService);
    jest.spyOn(service as any, `buildSummary`).mockResolvedValue(createEmptySummary());
    jest.spyOn(service as any, `buildPendingRequests`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildQuickDocs`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildVerification`).mockResolvedValue(createPendingVerificationState());

    const result = await service.getDashboardData(consumerId);

    expect(result.activity).toStrictEqual([
      {
        id: `kyc`,
        label: `Identity verified`,
        createdAt: verifiedAt.toISOString(),
        kind: `kyc_completed`,
      },
      {
        id: `w9`,
        label: `W-9 pack ready`,
        createdAt: w9CreatedAt.toISOString(),
        kind: `w9_ready`,
      },
      {
        id: `bank`,
        label: `Bank account added`,
        createdAt: cardCreatedAt.toISOString(),
        kind: `bank_added`,
      },
    ]);
    expect(result.tasks).toStrictEqual([
      {
        id: `kyc`,
        label: `Complete KYC`,
        completed: true,
      },
      {
        id: `profile`,
        label: `Complete your profile`,
        completed: true,
      },
      {
        id: `w9`,
        label: `Upload W-9 form`,
        completed: true,
      },
      {
        id: `bank`,
        label: `Add bank account`,
        completed: false,
      },
    ]);
  });

  it(`preserves quick docs query order, current field mapping, and empty createdAt fallback`, async () => {
    const consumerId = `consumer-quick-docs`;
    const dashboardQuery = createDashboardQueryMock({
      findQuickDocs: mockResolved([
        {
          resource: {
            id: `doc-2`,
            originalName: `Later.pdf`,
            createdAt: null,
            mimetype: `application/pdf`,
            size: 4096,
            downloadUrl: `https://files.example/later.pdf`,
          },
        },
        {
          resource: {
            id: `doc-1`,
            originalName: `Earlier.pdf`,
            createdAt: new Date(`2026-04-02T10:00:00.000Z`),
            mimetype: `application/pdf`,
            size: 2048,
            downloadUrl: `https://files.example/earlier.pdf`,
          },
        },
      ]),
    });
    const balanceService = {
      calculateMultiCurrency: mockResolved({ balances: {} }),
    } as any;

    const service = new ConsumerDashboardService(dashboardQuery, balanceService);
    jest.spyOn(service as any, `buildSummary`).mockResolvedValue(createEmptySummary());
    jest.spyOn(service as any, `buildPendingRequests`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildActivity`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildTasks`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildVerification`).mockResolvedValue(createPendingVerificationState());

    const result = await service.getDashboardData(consumerId);

    expect(result.quickDocs).toStrictEqual([
      {
        id: `doc-2`,
        name: `Later.pdf`,
        createdAt: ``,
      },
      {
        id: `doc-1`,
        name: `Earlier.pdf`,
        createdAt: `2026-04-02T10:00:00.000Z`,
      },
    ]);
    expect(result.quickDocs[0]).not.toHaveProperty(`mimetype`);
    expect(result.quickDocs[0]).not.toHaveProperty(`size`);
    expect(result.quickDocs[0]).not.toHaveProperty(`downloadUrl`);
  });

  it(`logs and rethrows the original error when a dashboard builder fails`, async () => {
    const consumerId = `consumer-dashboard-error`;
    const failure = new Error(`quick docs exploded`);
    const dashboardQuery = createDashboardQueryMock({
      findQuickDocs: jest.fn<() => Promise<never>>().mockRejectedValue(failure),
    });
    const balanceService = {
      calculateMultiCurrency: mockResolved({ balances: {} }),
    } as any;

    const service = new ConsumerDashboardService(dashboardQuery, balanceService);
    jest.spyOn(service as any, `buildSummary`).mockResolvedValue(createEmptySummary());
    jest.spyOn(service as any, `buildPendingRequests`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildActivity`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildTasks`).mockResolvedValue([]);
    const loggerErrorSpy = jest.spyOn((service as any).logger, `error`).mockImplementation(() => undefined);

    await expect(service.getDashboardData(consumerId)).rejects.toBe(failure);
    expect(loggerErrorSpy).toHaveBeenCalledWith(`Failed to build dashboard data`, {
      consumerId,
      error: failure.message,
      stack: failure.stack,
    });
  });

  it(`keeps first activity row per ledger, applies bank-label fallback, and limits to eight items`, async () => {
    const consumerId = `consumer-activity-dedupe`;
    const dashboardQuery = createDashboardQueryMock({
      findFinancialActivityRows: mockResolved([
        {
          id: `entry-dup-first`,
          ledgerId: `ledger-dup`,
          type: $Enums.LedgerEntryType.USER_PAYOUT,
          status: $Enums.TransactionStatus.PENDING,
          amount: -10,
          currencyCode: $Enums.CurrencyCode.USD,
          createdAt: new Date(`2026-04-03T18:00:00.000Z`),
          metadata: { paymentMethodId: `pm-fallback` },
          paymentRequestId: null,
          outcomes: [{ status: $Enums.TransactionStatus.PENDING }],
          paymentRequest: null,
        },
        {
          id: `entry-dup-second`,
          ledgerId: `ledger-dup`,
          type: $Enums.LedgerEntryType.USER_PAYOUT,
          status: $Enums.TransactionStatus.COMPLETED,
          amount: -10,
          currencyCode: $Enums.CurrencyCode.USD,
          createdAt: new Date(`2026-04-03T17:59:00.000Z`),
          metadata: { paymentMethodId: `pm-fallback` },
          paymentRequestId: null,
          outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
          paymentRequest: null,
        },
        {
          id: `entry-a`,
          ledgerId: `ledger-a`,
          type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
          status: $Enums.TransactionStatus.COMPLETED,
          amount: 1,
          currencyCode: $Enums.CurrencyCode.USD,
          createdAt: new Date(`2026-04-03T17:58:00.000Z`),
          metadata: null,
          paymentRequestId: null,
          outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
          paymentRequest: null,
        },
        {
          id: `entry-b`,
          ledgerId: `ledger-b`,
          type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
          status: $Enums.TransactionStatus.COMPLETED,
          amount: 1,
          currencyCode: $Enums.CurrencyCode.USD,
          createdAt: new Date(`2026-04-03T17:57:00.000Z`),
          metadata: null,
          paymentRequestId: null,
          outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
          paymentRequest: null,
        },
        {
          id: `entry-c`,
          ledgerId: `ledger-c`,
          type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
          status: $Enums.TransactionStatus.COMPLETED,
          amount: 1,
          currencyCode: $Enums.CurrencyCode.USD,
          createdAt: new Date(`2026-04-03T17:56:00.000Z`),
          metadata: null,
          paymentRequestId: null,
          outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
          paymentRequest: null,
        },
        {
          id: `entry-d`,
          ledgerId: `ledger-d`,
          type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
          status: $Enums.TransactionStatus.COMPLETED,
          amount: 1,
          currencyCode: $Enums.CurrencyCode.USD,
          createdAt: new Date(`2026-04-03T17:55:00.000Z`),
          metadata: null,
          paymentRequestId: null,
          outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
          paymentRequest: null,
        },
        {
          id: `entry-e`,
          ledgerId: `ledger-e`,
          type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
          status: $Enums.TransactionStatus.COMPLETED,
          amount: 1,
          currencyCode: $Enums.CurrencyCode.USD,
          createdAt: new Date(`2026-04-03T17:54:00.000Z`),
          metadata: null,
          paymentRequestId: null,
          outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
          paymentRequest: null,
        },
        {
          id: `entry-f`,
          ledgerId: `ledger-f`,
          type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
          status: $Enums.TransactionStatus.COMPLETED,
          amount: 1,
          currencyCode: $Enums.CurrencyCode.USD,
          createdAt: new Date(`2026-04-03T17:53:00.000Z`),
          metadata: null,
          paymentRequestId: null,
          outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
          paymentRequest: null,
        },
        {
          id: `entry-g`,
          ledgerId: `ledger-g`,
          type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
          status: $Enums.TransactionStatus.COMPLETED,
          amount: 1,
          currencyCode: $Enums.CurrencyCode.USD,
          createdAt: new Date(`2026-04-03T17:52:00.000Z`),
          metadata: null,
          paymentRequestId: null,
          outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
          paymentRequest: null,
        },
        {
          id: `entry-h`,
          ledgerId: `ledger-h`,
          type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
          status: $Enums.TransactionStatus.COMPLETED,
          amount: 1,
          currencyCode: $Enums.CurrencyCode.USD,
          createdAt: new Date(`2026-04-03T17:51:00.000Z`),
          metadata: null,
          paymentRequestId: null,
          outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
          paymentRequest: null,
        },
      ]),
      findPaymentMethodLabels: mockResolved([
        {
          id: `pm-fallback`,
          brand: ``,
          last4: `4321`,
        },
      ]),
    });
    const balanceService = {
      calculateMultiCurrency: mockResolved({ balances: {} }),
    } as any;

    const service = new ConsumerDashboardService(dashboardQuery, balanceService);
    jest.spyOn(service as any, `buildSummary`).mockResolvedValue(createEmptySummary());
    jest.spyOn(service as any, `buildPendingRequests`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildTasks`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildQuickDocs`).mockResolvedValue([]);
    jest.spyOn(service as any, `buildVerification`).mockResolvedValue(createPendingVerificationState());

    const result = await service.getDashboardData(consumerId);

    expect(result.activity).toHaveLength(8);
    expect(result.activity[0]).toStrictEqual({
      id: `ledger-dup`,
      label: `Withdrawal`,
      description: `Pending • 10.00 USD • to Bank account •••• 4321`,
      createdAt: `2026-04-03T18:00:00.000Z`,
      kind: `withdrawal`,
    });
    expect(result.activity.map((item) => item.id)).toStrictEqual([
      `ledger-dup`,
      `ledger-a`,
      `ledger-b`,
      `ledger-c`,
      `ledger-d`,
      `ledger-e`,
      `ledger-f`,
      `ledger-g`,
    ]);
    expect(result.activity.map((item) => item.id)).not.toContain(`ledger-h`);
  });
});
