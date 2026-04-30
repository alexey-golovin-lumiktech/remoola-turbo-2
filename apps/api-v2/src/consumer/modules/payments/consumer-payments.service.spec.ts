import { BadRequestException } from '@nestjs/common';

import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerPaymentsCommandsService } from './consumer-payments-commands.service';
import { ConsumerPaymentsPoliciesService } from './consumer-payments-policies.service';
import { ConsumerPaymentsQueriesService } from './consumer-payments-queries.service';
import { ConsumerPaymentsService as ConsumerPaymentsServiceClass } from './consumer-payments.service';
import { type TransferBody, type WithdrawBody } from './dto';
import { type StartPayment } from './dto/start-payment.dto';
import { BalanceCalculationMode } from '../../../shared/balance-calculation.service';

class ConsumerPaymentsService extends ConsumerPaymentsServiceClass {
  private readonly testPoliciesService: ConsumerPaymentsPoliciesService;

  constructor(prisma: any, mailingService: any, balanceService: any) {
    const policiesService = new ConsumerPaymentsPoliciesService(prisma);
    const commandPolicies: any = {
      appendConsumerAppScopeMetadata: (...args: any[]) =>
        (policiesService.appendConsumerAppScopeMetadata as any)(...args),
    };

    super(
      policiesService,
      new ConsumerPaymentsQueriesService(prisma, balanceService),
      new ConsumerPaymentsCommandsService(prisma, mailingService, balanceService, commandPolicies),
    );

    this.testPoliciesService = policiesService;
    commandPolicies.buildTransferRecipientWhere = (...args: any[]) => this.buildTransferRecipientWhere(...args);
    commandPolicies.ensureLimits = (...args: any[]) => this.ensureLimits(...args);
    commandPolicies.ensureProfileComplete = (...args: any[]) => this.ensureProfileComplete(...args);
  }

  buildTransferRecipientWhere(...args: any[]) {
    return (this.testPoliciesService.buildTransferRecipientWhere as any)(...args);
  }

  ensureProfileComplete(...args: any[]) {
    return (this.testPoliciesService.ensureProfileComplete as any)(...args);
  }

  getKycLimits(...args: any[]) {
    return (this.testPoliciesService.getKycLimits as any)(...args);
  }

  getTodayOutgoingTotal(...args: any[]) {
    return (this.testPoliciesService.getTodayOutgoingTotal as any)(...args);
  }

  ensureLimits(...args: any[]) {
    return (this.testPoliciesService.ensureLimits as any)(...args);
  }
}

describe(`ConsumerPaymentsService.createPaymentRequest`, () => {
  const consumerId = `consumer-1`;
  const requesterEmail = `requester@example.com`;
  const completeConsumerProfile = {
    id: consumerId,
    email: requesterEmail,
    accountType: $Enums.AccountType.CONTRACTOR,
    contractorKind: $Enums.ContractorKind.INDIVIDUAL,
    personalDetails: {
      legalStatus: $Enums.LegalStatus.INDIVIDUAL,
      taxId: `tax-id`,
      passportOrIdNumber: `passport`,
      phoneNumber: null,
    },
  };

  function makeService() {
    const prisma = {
      consumerModel: {
        findUnique: jest.fn(async (args: any) => {
          if (args.select?.email) {
            return { email: requesterEmail };
          }
          return completeConsumerProfile;
        }),
        findFirst: jest.fn(),
      },
      paymentRequestModel: {
        create: jest.fn(),
      },
    } as any;

    const mailingService = {} as any;
    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma as any, mailingService, balanceService);

    return { service, prisma };
  }

  it(`links registered recipient when email exists`, async () => {
    const { service, prisma } = makeService();
    prisma.consumerModel.findFirst.mockResolvedValue({
      id: `recipient-1`,
      email: `payee@example.com`,
    });
    prisma.paymentRequestModel.create.mockResolvedValue({ id: `pr-1` });

    const result = await service.createPaymentRequest(consumerId, {
      email: `PAYEE@example.com`,
      amount: `123.45`,
      currencyCode: $Enums.CurrencyCode.USD,
      description: `Test`,
    });

    expect(result).toEqual({ paymentRequestId: `pr-1` });
    expect(prisma.paymentRequestModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payerId: `recipient-1`,
          payerEmail: `payee@example.com`,
          requesterId: consumerId,
        }),
      }),
    );
  });

  it(`creates email-only recipient when no consumer exists`, async () => {
    const { service, prisma } = makeService();
    prisma.consumerModel.findFirst.mockResolvedValue(null);
    prisma.paymentRequestModel.create.mockResolvedValue({ id: `pr-2` });

    const result = await service.createPaymentRequest(consumerId, {
      email: `  outside@example.com `,
      amount: `10.00`,
      currencyCode: $Enums.CurrencyCode.USD,
    });

    expect(result).toEqual({ paymentRequestId: `pr-2` });
    expect(prisma.paymentRequestModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payerId: null,
          payerEmail: `outside@example.com`,
          requesterId: consumerId,
        }),
      }),
    );
  });

  it(`keeps self-payment guard for existing recipient`, async () => {
    const { service, prisma } = makeService();
    prisma.consumerModel.findFirst.mockResolvedValue({
      id: consumerId,
      email: requesterEmail,
    });

    await expect(
      service.createPaymentRequest(consumerId, {
        email: requesterEmail,
        amount: `10`,
        currencyCode: $Enums.CurrencyCode.USD,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it(`keeps self-payment guard for email-only path`, async () => {
    const { service, prisma } = makeService();
    prisma.consumerModel.findFirst.mockResolvedValue(null);

    await expect(
      service.createPaymentRequest(consumerId, {
        email: `REQUESTER@example.com`,
        amount: `10`,
        currencyCode: $Enums.CurrencyCode.USD,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe(`ConsumerPaymentsService.startPayment`, () => {
  const consumerId = `consumer-1`;
  const payerEmail = `payer@example.com`;
  const completeConsumerProfile = {
    id: consumerId,
    email: payerEmail,
    accountType: $Enums.AccountType.CONTRACTOR,
    contractorKind: $Enums.ContractorKind.INDIVIDUAL,
    personalDetails: {
      legalStatus: $Enums.LegalStatus.INDIVIDUAL,
      taxId: `tax-id`,
      passportOrIdNumber: `passport`,
      phoneNumber: null,
    },
  };

  function makeService() {
    const tx = {
      paymentRequestModel: { create: jest.fn().mockResolvedValue({ id: `pr-1` }) },
      ledgerEntryModel: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      consumerModel: {
        findUnique: jest.fn(async (args: { select?: { email?: boolean }; include?: unknown }) => {
          if (args.select?.email) {
            return { email: payerEmail };
          }
          return completeConsumerProfile;
        }),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn((fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    } as any;
    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);
    return { service, prisma, tx };
  }

  it(`creates non-USD card-funded payment and ledger when recipient exists (case-insensitive email)`, async () => {
    const { service, prisma, tx } = makeService();
    prisma.consumerModel.findFirst.mockResolvedValue({
      id: `recipient-1`,
      email: `recipient@example.com`,
    });

    const body: StartPayment = {
      email: `RECIPIENT@example.com`,
      amount: `50.00`,
      currencyCode: $Enums.CurrencyCode.EUR,
      description: `Test`,
      method: $Enums.PaymentMethodType.CREDIT_CARD,
    };

    const result = await service.startPayment(consumerId, body, CURRENT_CONSUMER_APP_SCOPE);

    expect(result).toEqual({ paymentRequestId: `pr-1`, ledgerId: expect.any(String) });
    expect(prisma.consumerModel.findFirst).toHaveBeenCalledWith({
      where: {
        email: { equals: `recipient@example.com`, mode: `insensitive` },
        deletedAt: null,
      },
    });
    expect(tx.paymentRequestModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payerId: consumerId,
          requesterId: `recipient-1`,
          requesterEmail: `recipient@example.com`,
          currencyCode: $Enums.CurrencyCode.EUR,
          paymentRail: $Enums.PaymentRail.CARD,
          amount: 50,
        }),
      }),
    );
    expect(tx.ledgerEntryModel.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          consumerId,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
          currencyCode: $Enums.CurrencyCode.EUR,
          amount: -50,
          metadata: expect.objectContaining({
            rail: $Enums.PaymentRail.CARD,
            counterpartyId: `recipient-1`,
            consumerAppScope: CURRENT_CONSUMER_APP_SCOPE,
          }),
        }),
      }),
    );
    expect(tx.ledgerEntryModel.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          consumerId: `recipient-1`,
          type: $Enums.LedgerEntryType.USER_DEPOSIT,
          currencyCode: $Enums.CurrencyCode.EUR,
          amount: 50,
          metadata: expect.objectContaining({
            rail: $Enums.PaymentRail.CARD,
            counterpartyId: consumerId,
            consumerAppScope: CURRENT_CONSUMER_APP_SCOPE,
          }),
        }),
      }),
    );
  });

  it(`keeps requester leg as user payment for non-USD bank-transfer funded start payment`, async () => {
    const { service, prisma, tx } = makeService();
    prisma.consumerModel.findFirst.mockResolvedValue({
      id: `recipient-1`,
      email: `recipient@example.com`,
    });

    await service.startPayment(consumerId, {
      email: `recipient@example.com`,
      amount: `20.00`,
      currencyCode: $Enums.CurrencyCode.GBP,
      description: `Bank funded`,
      method: $Enums.PaymentMethodType.BANK_ACCOUNT,
    });

    expect(tx.paymentRequestModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currencyCode: $Enums.CurrencyCode.GBP,
          paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
        }),
      }),
    );

    expect(tx.ledgerEntryModel.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          consumerId: `recipient-1`,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
          currencyCode: $Enums.CurrencyCode.GBP,
          amount: 20,
        }),
      }),
    );
  });

  it(`creates payment with unregistered recipient when recipient not found`, async () => {
    const { service, prisma, tx } = makeService();
    prisma.consumerModel.findFirst.mockResolvedValue(null);

    const result = await service.startPayment(consumerId, {
      email: `unknown@example.com`,
      amount: `10`,
      method: $Enums.PaymentMethodType.BANK_ACCOUNT,
    });

    expect(result).toEqual({ paymentRequestId: `pr-1`, ledgerId: expect.any(String) });
    expect(tx.paymentRequestModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payerId: consumerId,
          requesterId: null,
          requesterEmail: `unknown@example.com`,
          paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
          amount: 10,
        }),
      }),
    );
    expect(tx.ledgerEntryModel.create).toHaveBeenCalledTimes(1);
  });

  it(`rejects when recipient is self (by id)`, async () => {
    const { service, prisma } = makeService();
    prisma.consumerModel.findFirst.mockResolvedValue({
      id: consumerId,
      email: `other@example.com`,
    });

    await expect(
      service.startPayment(consumerId, {
        email: `other@example.com`,
        amount: `10`,
        method: $Enums.PaymentMethodType.CREDIT_CARD,
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.startPayment(consumerId, {
        email: `other@example.com`,
        amount: `10`,
        method: $Enums.PaymentMethodType.CREDIT_CARD,
      }),
    ).rejects.toThrow(errorCodes.CANNOT_TRANSFER_TO_SELF_START_PAYMENT);
  });

  it(`rejects when recipient email equals current user email (self by email)`, async () => {
    const { service, prisma } = makeService();
    prisma.consumerModel.findFirst.mockResolvedValue(null);

    await expect(
      service.startPayment(consumerId, {
        email: `PAYER@example.com`,
        amount: `10`,
        method: $Enums.PaymentMethodType.CREDIT_CARD,
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.startPayment(consumerId, {
        email: `PAYER@example.com`,
        amount: `10`,
        method: $Enums.PaymentMethodType.CREDIT_CARD,
      }),
    ).rejects.toThrow(errorCodes.CANNOT_TRANSFER_TO_SELF_START_PAYMENT);
    expect(prisma.consumerModel.findFirst).not.toHaveBeenCalled();
  });

  it(`rejects invalid amount`, async () => {
    const { service, prisma } = makeService();
    prisma.consumerModel.findFirst.mockResolvedValue({
      id: `recipient-1`,
      email: `r@example.com`,
    });

    await expect(
      service.startPayment(consumerId, {
        email: `r@example.com`,
        amount: `0`,
        method: $Enums.PaymentMethodType.CREDIT_CARD,
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.startPayment(consumerId, {
        email: `r@example.com`,
        amount: `-1`,
        method: $Enums.PaymentMethodType.CREDIT_CARD,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe(`ConsumerPaymentsService.sendPaymentRequest`, () => {
  const consumerId = `consumer-1`;
  const requesterEmail = `requester@example.com`;
  const completeConsumerProfile = {
    id: consumerId,
    email: requesterEmail,
    accountType: $Enums.AccountType.CONTRACTOR,
    contractorKind: $Enums.ContractorKind.INDIVIDUAL,
    personalDetails: {
      legalStatus: $Enums.LegalStatus.INDIVIDUAL,
      taxId: `tax-id`,
      passportOrIdNumber: `passport`,
      phoneNumber: null,
    },
  };

  function makeService() {
    const tx = {
      paymentRequestModel: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      ledgerEntryModel: {
        create: jest.fn(),
      },
    };

    const prisma = {
      consumerModel: {
        findUnique: jest.fn(async () => completeConsumerProfile),
      },
      $transaction: jest.fn(async (callback: (innerTx: typeof tx) => Promise<unknown>) => callback(tx)),
    } as any;

    const mailingService = {
      sendPaymentRequestEmail: jest.fn(async () => undefined),
    } as any;

    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;

    const service = new ConsumerPaymentsService(prisma, mailingService, balanceService);
    return { service, prisma, tx, mailingService };
  }

  it(`creates paired ledger entries when payer is registered`, async () => {
    const { service, tx } = makeService();

    tx.paymentRequestModel.findUnique.mockResolvedValue({
      id: `pr-1`,
      requesterId: consumerId,
      payerId: `payer-1`,
      payerEmail: null,
      status: $Enums.TransactionStatus.DRAFT,
      amount: 55.25,
      currencyCode: $Enums.CurrencyCode.USD,
      description: `Test`,
      dueDate: null,
      payer: { email: `payer@example.com` },
      requester: { email: requesterEmail },
      _count: { ledgerEntries: 0 },
    });
    tx.paymentRequestModel.update.mockResolvedValue({ id: `pr-1` });
    tx.ledgerEntryModel.create.mockResolvedValue({});

    const result = await service.sendPaymentRequest(consumerId, `pr-1`, CURRENT_CONSUMER_APP_SCOPE);

    expect(result).toEqual({ paymentRequestId: `pr-1` });
    expect(tx.ledgerEntryModel.create).toHaveBeenCalledTimes(2);
    expect(tx.ledgerEntryModel.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          paymentRequestId: `pr-1`,
          consumerId: `payer-1`,
          amount: -55.25,
          metadata: expect.objectContaining({
            counterpartyId: consumerId,
            consumerAppScope: CURRENT_CONSUMER_APP_SCOPE,
          }),
        }),
      }),
    );
    expect(tx.ledgerEntryModel.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          paymentRequestId: `pr-1`,
          consumerId,
          amount: 55.25,
          metadata: expect.objectContaining({
            counterpartyId: `payer-1`,
            consumerAppScope: CURRENT_CONSUMER_APP_SCOPE,
          }),
        }),
      }),
    );
    expect((tx.ledgerEntryModel.create as jest.Mock).mock.calls[0]?.[0]?.data?.metadata).toEqual(
      expect.not.objectContaining({
        rail: expect.anything(),
      }),
    );
    expect((tx.ledgerEntryModel.create as jest.Mock).mock.calls[1]?.[0]?.data?.metadata).toEqual(
      expect.not.objectContaining({
        rail: expect.anything(),
      }),
    );
  });

  it(`does not create ledger entries when payer is email-only`, async () => {
    const { service, tx, mailingService } = makeService();

    tx.paymentRequestModel.findUnique.mockResolvedValue({
      id: `pr-2`,
      requesterId: consumerId,
      payerId: null,
      payerEmail: `outside@example.com`,
      status: $Enums.TransactionStatus.DRAFT,
      amount: 42,
      currencyCode: $Enums.CurrencyCode.USD,
      description: null,
      dueDate: null,
      payer: null,
      requester: { email: requesterEmail },
      _count: { ledgerEntries: 0 },
    });
    tx.paymentRequestModel.update.mockResolvedValue({ id: `pr-2` });

    const result = await service.sendPaymentRequest(consumerId, `pr-2`, CURRENT_CONSUMER_APP_SCOPE);

    expect(result).toEqual({ paymentRequestId: `pr-2` });
    expect(tx.ledgerEntryModel.create).not.toHaveBeenCalled();
    expect(mailingService.sendPaymentRequestEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        payerEmail: `outside@example.com`,
        requesterEmail,
        consumerAppScope: CURRENT_CONSUMER_APP_SCOPE,
      }),
    );
  });

  it(`throws when draft request already has ledger entries`, async () => {
    const { service, tx } = makeService();

    tx.paymentRequestModel.findUnique.mockResolvedValue({
      id: `pr-3`,
      requesterId: consumerId,
      payerId: `payer-1`,
      payerEmail: null,
      status: $Enums.TransactionStatus.DRAFT,
      amount: 9,
      currencyCode: $Enums.CurrencyCode.USD,
      description: null,
      dueDate: null,
      payer: { email: `payer@example.com` },
      requester: { email: requesterEmail },
      _count: { ledgerEntries: 1 },
    });

    await expect(service.sendPaymentRequest(consumerId, `pr-3`)).rejects.toThrow(BadRequestException);
    expect(tx.ledgerEntryModel.create).not.toHaveBeenCalled();
  });

  it(`throws when email-only draft request has any ledger entries`, async () => {
    const { service, tx } = makeService();

    tx.paymentRequestModel.findUnique.mockResolvedValue({
      id: `pr-4`,
      requesterId: consumerId,
      payerId: null,
      payerEmail: `outside@example.com`,
      status: $Enums.TransactionStatus.DRAFT,
      amount: 11,
      currencyCode: $Enums.CurrencyCode.USD,
      description: null,
      dueDate: null,
      payer: null,
      requester: { email: requesterEmail },
      _count: { ledgerEntries: 1 },
    });

    await expect(service.sendPaymentRequest(consumerId, `pr-4`)).rejects.toThrow(BadRequestException);
    expect(tx.ledgerEntryModel.create).not.toHaveBeenCalled();
  });
});

describe(`ConsumerPaymentsService.getPaymentView`, () => {
  const consumerId = `consumer-1`;
  const consumerEmail = `payer@example.com`;

  function makeService() {
    const prisma = {
      consumerModel: {
        findUnique: jest.fn(async (args: any) => {
          if (args.select?.email) {
            return { email: consumerEmail };
          }
          return {
            id: consumerId,
            email: consumerEmail,
            accountType: $Enums.AccountType.CONTRACTOR,
            contractorKind: $Enums.ContractorKind.INDIVIDUAL,
            personalDetails: {
              legalStatus: $Enums.LegalStatus.INDIVIDUAL,
              taxId: `tax-id`,
              passportOrIdNumber: `passport`,
              phoneNumber: null,
            },
          };
        }),
      },
      paymentRequestModel: {
        findUnique: jest.fn(),
      },
    } as any;

    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);
    return { service, prisma };
  }

  it(`allows access as payer when payerId is null but payerEmail matches`, async () => {
    const { service, prisma } = makeService();
    prisma.paymentRequestModel.findUnique.mockResolvedValue({
      id: `pr-email-only`,
      payerId: null,
      payerEmail: `PAYER@example.com`,
      requesterId: `requester-1`,
      amount: 12.5,
      currencyCode: $Enums.CurrencyCode.USD,
      status: $Enums.TransactionStatus.PENDING,
      description: null,
      dueDate: null,
      sentDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      payer: null,
      requester: { id: `requester-1`, email: `requester@example.com` },
      attachments: [],
      ledgerEntries: [],
    });

    const result = await service.getPaymentView(consumerId, `pr-email-only`);

    expect(result.role).toBe(`PAYER`);
    expect(result.payer.email).toBe(`PAYER@example.com`);
  });

  it(`prefers latest outcome status for ledger entries`, async () => {
    const { service, prisma } = makeService();
    prisma.paymentRequestModel.findUnique.mockResolvedValue({
      id: `pr-outcome`,
      payerId: consumerId,
      payerEmail: consumerEmail,
      requesterId: `requester-1`,
      amount: 12.5,
      currencyCode: $Enums.CurrencyCode.USD,
      status: $Enums.TransactionStatus.COMPLETED,
      description: null,
      dueDate: null,
      sentDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      payer: { id: consumerId, email: consumerEmail },
      requester: { id: `requester-1`, email: `requester@example.com` },
      attachments: [],
      ledgerEntries: [
        {
          id: `entry-1`,
          ledgerId: `ledger-1`,
          consumerId,
          currencyCode: $Enums.CurrencyCode.USD,
          amount: -12.5,
          status: $Enums.TransactionStatus.PENDING,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
          createdAt: new Date(),
          metadata: {},
          outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
        },
      ],
    });

    const result = await service.getPaymentView(consumerId, `pr-outcome`);

    expect(result.ledgerEntries[0]?.status).toBe($Enums.TransactionStatus.COMPLETED);
  });

  it(`falls back to payment request rail when ledger metadata rail is absent`, async () => {
    const { service, prisma } = makeService();
    prisma.paymentRequestModel.findUnique.mockResolvedValue({
      id: `pr-rail-fallback`,
      payerId: consumerId,
      payerEmail: consumerEmail,
      requesterId: `requester-1`,
      paymentRail: $Enums.PaymentRail.CARD,
      amount: 12.5,
      currencyCode: $Enums.CurrencyCode.USD,
      status: $Enums.TransactionStatus.COMPLETED,
      description: null,
      dueDate: null,
      sentDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      payer: { id: consumerId, email: consumerEmail },
      requester: { id: `requester-1`, email: `requester@example.com` },
      attachments: [],
      ledgerEntries: [
        {
          id: `entry-rail-fallback`,
          ledgerId: `ledger-rail-fallback`,
          consumerId,
          currencyCode: $Enums.CurrencyCode.USD,
          amount: -12.5,
          status: $Enums.TransactionStatus.COMPLETED,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
          createdAt: new Date(),
          metadata: {},
          outcomes: [],
        },
      ],
    });

    const result = await service.getPaymentView(consumerId, `pr-rail-fallback`);

    expect(result.ledgerEntries[0]?.rail).toBe($Enums.PaymentRail.CARD);
  });

  it(`normalizes requester deposit settlement back to product payment type in payment view`, async () => {
    const { service, prisma } = makeService();
    prisma.paymentRequestModel.findUnique.mockResolvedValue({
      id: `pr-deposit-view`,
      payerId: `payer-1`,
      payerEmail: `payer-1@example.com`,
      requesterId: consumerId,
      paymentRail: $Enums.PaymentRail.CARD,
      amount: 14.2,
      currencyCode: $Enums.CurrencyCode.USD,
      status: $Enums.TransactionStatus.COMPLETED,
      description: `Card funded`,
      dueDate: null,
      sentDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      payer: { id: `payer-1`, email: `payer-1@example.com` },
      requester: { id: consumerId, email: consumerEmail },
      attachments: [],
      ledgerEntries: [
        {
          id: `entry-deposit`,
          ledgerId: `ledger-deposit`,
          consumerId,
          paymentRequestId: `pr-deposit-view`,
          currencyCode: $Enums.CurrencyCode.USD,
          amount: 14.2,
          status: $Enums.TransactionStatus.COMPLETED,
          type: $Enums.LedgerEntryType.USER_DEPOSIT,
          createdAt: new Date(`2026-03-26T10:00:00.000Z`),
          metadata: { rail: $Enums.PaymentRail.CARD },
          outcomes: [],
        },
      ],
    });

    const result = await service.getPaymentView(consumerId, `pr-deposit-view`);

    expect(result.ledgerEntries[0]?.type).toBe($Enums.LedgerEntryType.USER_PAYMENT);
  });

  it(`shows only current consumer ledger entry for mirrored payment-request pair`, async () => {
    const { service, prisma } = makeService();
    prisma.paymentRequestModel.findUnique.mockResolvedValue({
      id: `pr-mirrored`,
      payerId: `payer-1`,
      payerEmail: `payer-1@example.com`,
      requesterId: consumerId,
      amount: 6.54,
      currencyCode: $Enums.CurrencyCode.EUR,
      status: $Enums.TransactionStatus.PENDING,
      description: `Registered payer detail E2E`,
      dueDate: null,
      sentDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      payer: { id: `payer-1`, email: `payer-1@example.com` },
      requester: { id: consumerId, email: consumerEmail },
      attachments: [],
      ledgerEntries: [
        {
          id: `entry-payer`,
          ledgerId: `ledger-shared`,
          consumerId: `payer-1`,
          currencyCode: $Enums.CurrencyCode.EUR,
          amount: -6.54,
          status: $Enums.TransactionStatus.PENDING,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
          createdAt: new Date(`2026-03-25T17:13:00.000Z`),
          metadata: {},
          outcomes: [],
        },
        {
          id: `entry-requester`,
          ledgerId: `ledger-shared`,
          consumerId,
          currencyCode: $Enums.CurrencyCode.EUR,
          amount: 6.54,
          status: $Enums.TransactionStatus.PENDING,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
          createdAt: new Date(`2026-03-25T17:13:01.000Z`),
          metadata: {},
          outcomes: [],
        },
      ],
    });

    const result = await service.getPaymentView(consumerId, `pr-mirrored`);

    expect(result.role).toBe(`REQUESTER`);
    expect(result.ledgerEntries).toHaveLength(1);
    expect(result.ledgerEntries[0]).toEqual(
      expect.objectContaining({
        id: `entry-requester`,
        amount: 6.54,
        direction: `INCOME`,
      }),
    );
  });

  it(
    `normalizes waiting-recipient-approval for payment view ` + `when latest consumer ledger outcome diverges`,
    async () => {
      const { service, prisma } = makeService();
      prisma.paymentRequestModel.findUnique.mockResolvedValue({
        id: `pr-waiting`,
        payerId: consumerId,
        payerEmail: consumerEmail,
        requesterId: `requester-1`,
        amount: 8.76,
        currencyCode: $Enums.CurrencyCode.EUR,
        status: $Enums.TransactionStatus.PENDING,
        description: `Live second consumer payer E2E`,
        dueDate: null,
        sentDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        payer: { id: consumerId, email: consumerEmail },
        requester: { id: `requester-1`, email: `requester@example.com` },
        attachments: [],
        ledgerEntries: [
          {
            id: `entry-waiting`,
            ledgerId: `ledger-waiting`,
            consumerId,
            currencyCode: $Enums.CurrencyCode.EUR,
            amount: -8.76,
            status: $Enums.TransactionStatus.PENDING,
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            createdAt: new Date(`2026-03-25T17:27:00.000Z`),
            metadata: {},
            outcomes: [{ status: $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL }],
          },
        ],
      });

      const result = await service.getPaymentView(consumerId, `pr-waiting`);

      expect(result.status).toBe($Enums.TransactionStatus.WAITING);
      expect(result.ledgerEntries[0]?.status).toBe($Enums.TransactionStatus.WAITING);
    },
  );
});

describe(`ConsumerPaymentsService.listPayments`, () => {
  const consumerId = `consumer-1`;
  const consumerEmail = `payer@example.com`;

  it(`prefers latest outcome status for latestTransaction`, async () => {
    const prisma = {
      consumerModel: {
        findUnique: jest.fn(async () => ({ email: consumerEmail })),
      },
      paymentRequestModel: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: `pr-1`,
            amount: 99.5,
            currencyCode: $Enums.CurrencyCode.USD,
            status: $Enums.TransactionStatus.COMPLETED,
            type: $Enums.TransactionType.BANK_TRANSFER,
            description: `Outcome-backed payment`,
            createdAt: new Date(),
            payerId: consumerId,
            payerEmail: consumerEmail,
            payer: { id: consumerId, email: consumerEmail },
            requester: { id: `requester-1`, email: `requester@example.com` },
            requesterEmail: `requester@example.com`,
            ledgerEntries: [
              {
                id: `entry-1`,
                createdAt: new Date(),
                status: $Enums.TransactionStatus.PENDING,
                outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
              },
            ],
          },
        ]),
      },
    } as any;
    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);

    const result = await service.listPayments({ consumerId, page: 1, pageSize: 20 });

    expect(result.items[0]?.latestTransaction?.status).toBe($Enums.TransactionStatus.COMPLETED);
    expect(result.items[0]?.role).toBe(`PAYER`);
    expect(prisma.paymentRequestModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          ledgerEntries: expect.objectContaining({
            where: { consumerId },
          }),
        }),
      }),
    );
  });

  it(`uses current consumer leg for latest transaction when mirrored pair is present`, async () => {
    const prisma = {
      consumerModel: {
        findUnique: jest.fn(async () => ({ email: consumerEmail })),
      },
      paymentRequestModel: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: `pr-mirrored-list`,
            amount: 6.54,
            currencyCode: $Enums.CurrencyCode.EUR,
            status: $Enums.TransactionStatus.PENDING,
            type: $Enums.TransactionType.BANK_TRANSFER,
            description: `Registered payer detail E2E`,
            createdAt: new Date(),
            payerId: `payer-1`,
            payerEmail: `payer-1@example.com`,
            payer: { id: `payer-1`, email: `payer-1@example.com` },
            requester: { id: consumerId, email: consumerEmail },
            requesterEmail: consumerEmail,
            ledgerEntries: [
              {
                id: `entry-payer`,
                consumerId: `payer-1`,
                createdAt: new Date(`2026-03-25T17:13:00.000Z`),
                status: $Enums.TransactionStatus.PENDING,
                outcomes: [],
              },
              {
                id: `entry-requester`,
                consumerId,
                createdAt: new Date(`2026-03-25T17:13:01.000Z`),
                status: $Enums.TransactionStatus.PENDING,
                outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
              },
            ],
          },
        ]),
      },
    } as any;
    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);

    const result = await service.listPayments({ consumerId, page: 1, pageSize: 20 });

    expect(result.items[0]?.role).toBe(`REQUESTER`);
    expect(result.items[0]?.latestTransaction).toEqual(
      expect.objectContaining({
        id: `entry-requester`,
        status: $Enums.TransactionStatus.COMPLETED,
      }),
    );
  });

  it(`prefers effective status for payment row when latest consumer ledger outcome diverges`, async () => {
    const prisma = {
      consumerModel: {
        findUnique: jest.fn(async () => ({ email: consumerEmail })),
      },
      paymentRequestModel: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: `pr-waiting-list`,
            amount: 8.76,
            currencyCode: $Enums.CurrencyCode.EUR,
            status: $Enums.TransactionStatus.PENDING,
            type: $Enums.TransactionType.BANK_TRANSFER,
            description: `Live second consumer payer E2E`,
            createdAt: new Date(),
            payerId: consumerId,
            payerEmail: consumerEmail,
            payer: { id: consumerId, email: consumerEmail },
            requester: { id: `requester-1`, email: `requester@example.com` },
            requesterEmail: `requester@example.com`,
            ledgerEntries: [
              {
                id: `entry-waiting`,
                consumerId,
                createdAt: new Date(`2026-03-25T17:27:00.000Z`),
                status: $Enums.TransactionStatus.PENDING,
                outcomes: [{ status: $Enums.TransactionStatus.WAITING }],
              },
            ],
          },
        ]),
      },
    } as any;
    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);

    const result = await service.listPayments({ consumerId, page: 1, pageSize: 20 });

    expect(result.items[0]?.status).toBe($Enums.TransactionStatus.WAITING);
    expect(result.items[0]?.latestTransaction?.status).toBe($Enums.TransactionStatus.WAITING);
  });

  it(`filters by effective status instead of raw payment request status`, async () => {
    const prisma = {
      consumerModel: {
        findUnique: jest.fn(async () => ({ email: consumerEmail })),
      },
      paymentRequestModel: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: `pr-waiting-filter`,
            amount: 8.76,
            currencyCode: $Enums.CurrencyCode.EUR,
            status: $Enums.TransactionStatus.PENDING,
            type: $Enums.TransactionType.BANK_TRANSFER,
            description: `Live second consumer payer E2E`,
            createdAt: new Date(),
            payerId: consumerId,
            payerEmail: consumerEmail,
            payer: { id: consumerId, email: consumerEmail },
            requester: { id: `requester-1`, email: `requester@example.com` },
            requesterEmail: `requester@example.com`,
            ledgerEntries: [
              {
                id: `entry-waiting-filter`,
                consumerId,
                createdAt: new Date(`2026-03-25T17:27:00.000Z`),
                status: $Enums.TransactionStatus.PENDING,
                outcomes: [{ status: $Enums.TransactionStatus.WAITING }],
              },
            ],
          },
        ]),
      },
    } as any;
    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);

    const result = await service.listPayments({ consumerId, page: 1, pageSize: 20, status: `WAITING` });

    expect(result.total).toBe(1);
    expect(result.items[0]?.status).toBe($Enums.TransactionStatus.WAITING);
    expect(prisma.paymentRequestModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          status: $Enums.TransactionStatus.WAITING,
        }),
      }),
    );
  });

  it(`filters by requester role and labels rows accordingly`, async () => {
    const prisma = {
      consumerModel: {
        findUnique: jest.fn(async () => ({ email: consumerEmail })),
      },
      paymentRequestModel: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: `pr-requester`,
            amount: 27,
            currencyCode: $Enums.CurrencyCode.EUR,
            status: $Enums.TransactionStatus.PENDING,
            type: null,
            description: `Role-filtered request`,
            createdAt: new Date(),
            payerId: `payer-1`,
            payerEmail: `payer@example.com`,
            payer: { id: `payer-1`, email: `payer@example.com` },
            requesterId: consumerId,
            requesterEmail: consumerEmail,
            requester: { id: consumerId, email: consumerEmail },
            ledgerEntries: [],
          },
        ]),
      },
    } as any;
    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);

    const result = await service.listPayments({ consumerId, page: 1, pageSize: 20, role: `REQUESTER` });

    expect(prisma.paymentRequestModel.count).toHaveBeenCalledWith({
      where: {
        OR: [
          { requesterId: consumerId },
          { requesterId: null, requesterEmail: { equals: consumerEmail, mode: `insensitive` } },
        ],
      },
    });
    expect(result.items[0]?.role).toBe(`REQUESTER`);
  });

  it(`searches requester rows by email-only payer address`, async () => {
    const prisma = {
      consumerModel: {
        findUnique: jest.fn(async () => ({ email: consumerEmail })),
      },
      paymentRequestModel: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          {
            id: `pr-requester-email-search`,
            amount: 7.25,
            currencyCode: $Enums.CurrencyCode.EUR,
            status: $Enums.TransactionStatus.PENDING,
            type: null,
            description: `Cleanup-safe payment request E2E`,
            createdAt: new Date(),
            payerId: null,
            payerEmail: `payment-request-e2e-20260325@example.invalid`,
            payer: null,
            requesterId: consumerId,
            requesterEmail: consumerEmail,
            requester: { id: consumerId, email: consumerEmail },
            ledgerEntries: [],
          },
        ]),
      },
    } as any;
    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);

    const result = await service.listPayments({
      consumerId,
      page: 1,
      pageSize: 20,
      role: `REQUESTER`,
      search: `payment-request-e2e-20260325@example.invalid`,
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.counterparty.email).toBe(`payment-request-e2e-20260325@example.invalid`);
    expect(prisma.paymentRequestModel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { requesterId: consumerId },
                { requesterId: null, requesterEmail: { equals: consumerEmail, mode: `insensitive` } },
              ],
            },
            {
              OR: expect.arrayContaining([
                { payerEmail: { contains: `payment-request-e2e-20260325@example.invalid`, mode: `insensitive` } },
              ]),
            },
          ],
        },
      }),
    );
  });
});

describe(`ConsumerPaymentsService.withdraw`, () => {
  const consumerId = `consumer-1`;

  it(`throws when idempotency key is missing`, async () => {
    const prisma = { ledgerEntryModel: {}, $transaction: jest.fn() } as any;
    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);
    (service as any).ensureLimits = jest.fn().mockResolvedValue(undefined);

    await expect(service.withdraw(consumerId, { amount: 100 } as WithdrawBody, undefined)).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.withdraw(consumerId, { amount: 100 } as WithdrawBody, undefined)).rejects.toThrow(
      errorCodes.IDEMPOTENCY_KEY_REQUIRED_WITHDRAW,
    );
    await expect(service.withdraw(consumerId, { amount: 100 } as WithdrawBody, `  `)).rejects.toThrow(
      BadRequestException,
    );
  });

  it(`returns same entry when idempotency key is reused`, async () => {
    const existingEntry = {
      id: `entry-1`,
      ledgerId: `ledger-1`,
      consumerId,
      type: $Enums.LedgerEntryType.USER_PAYOUT,
      amount: -100,
      status: $Enums.TransactionStatus.PENDING,
      currencyCode: $Enums.CurrencyCode.USD,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    const prisma = {
      ledgerEntryModel: {
        findFirst: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(existingEntry),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 500 } }),
        create: jest.fn().mockResolvedValue(existingEntry),
      },
      $transaction: jest.fn((fn: (tx: any) => Promise<any>) => {
        const queryToStr = (q: unknown): string =>
          typeof q === `string`
            ? q
            : q && typeof q === `object` && (q as any).strings
              ? (q as any).strings.join(`?`)
              : String(q);
        const tx = {
          $executeRaw: jest.fn().mockResolvedValue(undefined),
          $queryRaw: jest.fn().mockImplementation((query) => {
            const queryStr = queryToStr(query);
            if (queryStr.includes(`pg_advisory_xact_lock`)) return Promise.resolve([]);
            if (
              queryStr.includes(`SUM(amount)`) ||
              queryStr.includes(`SUM(le.amount)`) ||
              queryStr.includes(`COALESCE(SUM`)
            )
              return Promise.resolve([{ balance: 500 }]);
            return Promise.resolve(undefined);
          }),
          ledgerEntryModel: {
            aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 500 } }),
            create: jest.fn().mockResolvedValue(existingEntry),
          },
        };
        return fn(tx);
      }),
    } as any;

    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);
    (service as any).ensureLimits = jest.fn().mockResolvedValue(undefined);

    const body: WithdrawBody = { amount: 100, method: $Enums.PaymentMethodType.BANK_ACCOUNT };
    const first = await service.withdraw(consumerId, body, `key-1`);
    const second = await service.withdraw(consumerId, body, `key-1`);

    expect(first.id).toBe(`entry-1`);
    expect(second.id).toBe(`entry-1`);
    expect(prisma.ledgerEntryModel.findFirst).toHaveBeenCalledWith({
      where: {
        idempotencyKey: `withdraw:key-1`,
        consumerId,
        type: $Enums.LedgerEntryType.USER_PAYOUT,
        deletedAt: null,
      },
    });
  });

  it(`accepts legacy mobile currency alias`, async () => {
    const createdEntry = {
      id: `entry-legacy`,
      ledgerId: `ledger-legacy`,
      consumerId,
      type: $Enums.LedgerEntryType.USER_PAYOUT,
      amount: -100,
      status: $Enums.TransactionStatus.PENDING,
      currencyCode: $Enums.CurrencyCode.EUR,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    const createSpy = jest.fn().mockResolvedValue(createdEntry);
    const prisma = {
      ledgerEntryModel: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      paymentMethodModel: {
        findFirst: jest.fn().mockResolvedValue({
          id: `pm_legacy`,
          type: $Enums.PaymentMethodType.BANK_ACCOUNT,
        }),
      },
      $transaction: jest.fn((fn: (tx: any) => Promise<any>) => {
        const tx = {
          $executeRaw: jest.fn().mockResolvedValue(undefined),
          ledgerEntryModel: {
            create: createSpy,
          },
        };
        return fn(tx);
      }),
    } as any;

    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);
    (service as any).ensureLimits = jest.fn().mockResolvedValue(undefined);

    await service.withdraw(
      consumerId,
      {
        amount: 100,
        currency: $Enums.CurrencyCode.EUR,
        paymentMethodId: `pm_legacy`,
        note: `legacy note`,
      } as WithdrawBody,
      `legacy-key`,
    );

    expect(balanceService.calculateInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      consumerId,
      $Enums.CurrencyCode.EUR,
      {
        mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
      },
    );
    expect(createSpy).toHaveBeenCalledWith({
      data: expect.objectContaining({
        currencyCode: $Enums.CurrencyCode.EUR,
        idempotencyKey: `withdraw:legacy-key`,
        metadata: expect.objectContaining({
          paymentMethodId: `pm_legacy`,
          note: `legacy note`,
        }),
      }),
    });
  });

  it(`rejects non-bank payout destination ids`, async () => {
    const prisma = {
      ledgerEntryModel: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      paymentMethodModel: {
        findFirst: jest.fn().mockResolvedValue({
          id: `pm_card`,
          type: $Enums.PaymentMethodType.CREDIT_CARD,
        }),
      },
      $transaction: jest.fn(),
    } as any;

    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);
    (service as any).ensureLimits = jest.fn().mockResolvedValue(undefined);

    await expect(
      service.withdraw(
        consumerId,
        { amount: 100, currencyCode: $Enums.CurrencyCode.USD, paymentMethodId: `pm_card` } as WithdrawBody,
        `wrong-destination`,
      ),
    ).rejects.toThrow(errorCodes.PAYMENT_METHOD_NOT_FOUND);
  });
});

describe(`ConsumerPaymentsService.transfer`, () => {
  const consumerId = `consumer-1`;
  const recipientId = `00000000-0000-4000-8000-000000000002`;

  function queryRawImpl(balance: number) {
    return jest.fn().mockImplementation((query: unknown) => {
      const str =
        typeof query === `string`
          ? query
          : query && typeof query === `object` && (query as { strings?: string[] }).strings
            ? (query as { strings: string[] }).strings.join(`?`)
            : String(query);
      if (str.includes(`pg_advisory_xact_lock`)) return Promise.resolve([]);
      if (str.includes(`SUM(le.amount)`)) return Promise.resolve([{ balance }]);
      return Promise.resolve(undefined);
    });
  }

  it(`throws when idempotency key is missing`, async () => {
    const prisma = {
      consumerModel: { findFirst: jest.fn().mockResolvedValue({ id: `r1`, email: `r@x.com` }) },
      ledgerEntryModel: {},
      $transaction: jest.fn(),
    } as any;
    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);
    (service as any).ensureLimits = jest.fn().mockResolvedValue(undefined);

    const bodyNoKey: TransferBody = { amount: 50, recipient: `r@x.com` };
    await expect(service.transfer(consumerId, bodyNoKey, undefined)).rejects.toThrow(BadRequestException);
    await expect(service.transfer(consumerId, bodyNoKey, undefined)).rejects.toThrow(
      errorCodes.IDEMPOTENCY_KEY_REQUIRED_TRANSFER,
    );
    await expect(service.transfer(consumerId, { amount: 50, recipient: `r@x.com` }, `  `)).rejects.toThrow(
      BadRequestException,
    );
  });

  /* eslint-disable-next-line max-len */
  it(`happy path: creates exactly two ledger entries (debit sender, credit receiver) with same ledgerId and preserves ledger neutrality`, async () => {
    const createSpy = jest.fn().mockResolvedValue({});
    const prisma = {
      consumerModel: {
        findFirst: jest.fn().mockResolvedValue({ id: recipientId, email: `2@email.com` }),
      },
      ledgerEntryModel: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: createSpy,
      },
      $transaction: jest.fn((fn: (tx: any) => Promise<any>) => {
        const tx = {
          $executeRaw: jest.fn().mockResolvedValue(undefined),
          $queryRaw: queryRawImpl(10),
          ledgerEntryModel: { create: createSpy },
        };
        return fn(tx);
      }),
    } as any;

    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);
    (service as any).ensureLimits = jest.fn().mockResolvedValue(undefined);

    const body: TransferBody = { amount: 2, recipient: `2@email.com`, currencyCode: $Enums.CurrencyCode.USD };
    const result = await service.transfer(consumerId, body, `idem-key-1`);

    expect(result.ledgerId).toBeDefined();
    expect(createSpy).toHaveBeenCalledTimes(2);

    const [senderCall, receiverCall] = createSpy.mock.calls;
    const senderData = senderCall[0].data;
    const receiverData = receiverCall[0].data;

    expect(senderData.consumerId).toBe(consumerId);
    expect(senderData.amount).toBe(-2);
    expect(senderData.idempotencyKey).toBe(`transfer:idem-key-1:sender`);
    expect(senderData.ledgerId).toBe(result.ledgerId);
    expect(senderData.status).toBe($Enums.TransactionStatus.COMPLETED);
    expect(senderData.metadata).toMatchObject({
      rail: $Enums.PaymentRail.BANK_TRANSFER,
      senderId: consumerId,
      recipientId,
    });

    expect(receiverData.consumerId).toBe(recipientId);
    expect(receiverData.amount).toBe(2);
    expect(receiverData.idempotencyKey).toBe(`transfer:idem-key-1:recipient`);
    expect(receiverData.ledgerId).toBe(result.ledgerId);
    expect(receiverData.status).toBe($Enums.TransactionStatus.COMPLETED);
    expect(receiverData.metadata).toMatchObject({
      rail: $Enums.PaymentRail.BANK_TRANSFER,
      senderId: consumerId,
      recipientId,
    });

    expect(Number(senderData.amount) + Number(receiverData.amount)).toBe(0);
  });

  it(`returns same ledgerId when idempotency key is reused and does not create duplicate ledger entries`, async () => {
    const existingEntry = {
      id: `entry-1`,
      ledgerId: `ledger-1`,
      consumerId,
      type: $Enums.LedgerEntryType.USER_PAYMENT,
      idempotencyKey: `transfer:key-1:sender`,
      deletedAt: null,
    };

    const createSpy = jest.fn().mockResolvedValue({});
    const transactionSpy = jest.fn((fn: (tx: any) => Promise<any>) => {
      const tx = {
        $executeRaw: jest.fn().mockResolvedValue(undefined),
        $queryRaw: queryRawImpl(500),
        ledgerEntryModel: { create: createSpy },
      };
      return fn(tx);
    });

    const prisma = {
      consumerModel: {
        findFirst: jest.fn().mockResolvedValue({ id: recipientId, email: `r@example.com` }),
      },
      ledgerEntryModel: {
        findFirst: jest.fn().mockResolvedValueOnce(null).mockResolvedValue(existingEntry),
        create: createSpy,
      },
      $transaction: transactionSpy,
    } as any;

    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);
    (service as any).ensureLimits = jest.fn().mockResolvedValue(undefined);

    const body: TransferBody = { amount: 50, recipient: `r@example.com` };
    const first = await service.transfer(consumerId, body, `key-1`);
    const second = await service.transfer(consumerId, body, `key-1`);

    expect(first.ledgerId).toBeDefined();
    expect(second.ledgerId).toBe(`ledger-1`);
    expect(transactionSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledTimes(2);
    expect(prisma.ledgerEntryModel.findFirst).toHaveBeenCalledWith({
      where: {
        idempotencyKey: `transfer:key-1:sender`,
        consumerId,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        deletedAt: null,
      },
      select: { ledgerId: true },
    });
  });

  it(`accepts legacy mobile recipientId alias`, async () => {
    const createSpy = jest.fn().mockResolvedValue({});
    const prisma = {
      consumerModel: {
        findFirst: jest.fn().mockResolvedValue({ id: recipientId, email: `2@email.com` }),
      },
      ledgerEntryModel: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn((fn: (tx: any) => Promise<any>) => {
        const tx = {
          $executeRaw: jest.fn().mockResolvedValue(undefined),
          $queryRaw: queryRawImpl(500),
          ledgerEntryModel: { create: createSpy },
        };
        return fn(tx);
      }),
    } as any;

    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(500),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);
    (service as any).ensureLimits = jest.fn().mockResolvedValue(undefined);

    await service.transfer(
      consumerId,
      { amount: 50, recipientId, currency: $Enums.CurrencyCode.GBP, note: `legacy` } as TransferBody,
      `legacy-transfer`,
    );

    expect(prisma.consumerModel.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { id: recipientId },
          { email: { equals: recipientId, mode: `insensitive` } },
          { personalDetails: { phoneNumber: recipientId } },
        ],
        deletedAt: null,
      },
    });
    expect(balanceService.calculateInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      consumerId,
      $Enums.CurrencyCode.GBP,
      {
        mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
      },
    );
    expect(createSpy).toHaveBeenCalledTimes(2);
    expect(createSpy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          currencyCode: $Enums.CurrencyCode.GBP,
          idempotencyKey: `transfer:legacy-transfer:sender`,
        }),
      }),
    );
  });

  it(`does not query UUID id lookup when recipient is an email`, async () => {
    const prisma = {
      consumerModel: {
        findFirst: jest.fn().mockResolvedValue({ id: recipientId, email: `r@example.com` }),
      },
      ledgerEntryModel: {
        findFirst: jest.fn().mockResolvedValue({ ledgerId: `existing-ledger` }),
      },
      $transaction: jest.fn(),
    } as any;

    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);
    (service as any).ensureLimits = jest.fn().mockResolvedValue(undefined);

    await service.transfer(consumerId, { amount: 50, recipient: `r@example.com` }, `key-email`);

    expect(prisma.consumerModel.findFirst).not.toHaveBeenCalled();

    prisma.ledgerEntryModel.findFirst.mockResolvedValueOnce(null);
    await service.transfer(consumerId, { amount: 50, recipient: `r@example.com` }, `key-email-2`);

    expect(prisma.consumerModel.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { email: { equals: `r@example.com`, mode: `insensitive` } },
          { personalDetails: { phoneNumber: `r@example.com` } },
        ],
        deletedAt: null,
      },
    });
  });

  it(`treats non-UUID legacy recipientId alias as email or phone only`, async () => {
    const createSpy = jest.fn().mockResolvedValue({});
    const prisma = {
      consumerModel: {
        findFirst: jest.fn().mockResolvedValue({ id: recipientId, email: `legacy@example.com` }),
      },
      ledgerEntryModel: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn((fn: (tx: any) => Promise<any>) => {
        const tx = {
          $executeRaw: jest.fn().mockResolvedValue(undefined),
          $queryRaw: queryRawImpl(500),
          ledgerEntryModel: { create: createSpy },
        };
        return fn(tx);
      }),
    } as any;

    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(500),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);
    (service as any).ensureLimits = jest.fn().mockResolvedValue(undefined);

    await service.transfer(
      consumerId,
      { amount: 50, recipientId: `legacy@example.com`, currency: $Enums.CurrencyCode.GBP } as TransferBody,
      `legacy-email-transfer`,
    );

    expect(prisma.consumerModel.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { email: { equals: `legacy@example.com`, mode: `insensitive` } },
          { personalDetails: { phoneNumber: `legacy@example.com` } },
        ],
        deletedAt: null,
      },
    });
  });

  /* eslint-disable-next-line max-len */
  it(`atomic failure: when second ledger create throws, transaction throws and no partial state is returned`, async () => {
    const createSpy = jest.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error(`DB failure`));

    const prisma = {
      consumerModel: {
        findFirst: jest.fn().mockResolvedValue({ id: recipientId, email: `2@email.com` }),
      },
      ledgerEntryModel: { findFirst: jest.fn().mockResolvedValue(null), create: createSpy },
      $transaction: jest.fn((fn: (tx: any) => Promise<any>) => {
        const tx = {
          $executeRaw: jest.fn().mockResolvedValue(undefined),
          $queryRaw: queryRawImpl(10),
          ledgerEntryModel: { create: createSpy },
        };
        return fn(tx);
      }),
    } as any;

    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);
    (service as any).ensureLimits = jest.fn().mockResolvedValue(undefined);

    const body: TransferBody = { amount: 2, recipient: `2@email.com` };

    await expect(service.transfer(consumerId, body, `idem-atomic-1`)).rejects.toThrow(`An unexpected error occurred`);
    expect(createSpy).toHaveBeenCalledTimes(2);
  });
});

describe(`ConsumerPaymentsService.assertProfileCompleteForVerification`, () => {
  const consumerId = `consumer-1`;

  function makeService(consumer: unknown) {
    const prisma = {
      consumerModel: {
        findUnique: jest.fn().mockResolvedValue(consumer),
      },
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, {} as any);
    return { service, prisma };
  }

  it(`throws PROFILE_INCOMPLETE_VERIFY when consumer has no personal details`, async () => {
    const { service } = makeService({
      id: consumerId,
      accountType: $Enums.AccountType.CONTRACTOR,
      contractorKind: $Enums.ContractorKind.INDIVIDUAL,
      personalDetails: null,
    });
    await expect(service.assertProfileCompleteForVerification(consumerId)).rejects.toThrow(BadRequestException);
    await expect(service.assertProfileCompleteForVerification(consumerId)).rejects.toThrow(
      errorCodes.PROFILE_INCOMPLETE_VERIFY,
    );
  });

  it(`throws PROFILE_INCOMPLETE_VERIFY when individual contractor missing legalStatus`, async () => {
    const { service } = makeService({
      id: consumerId,
      accountType: $Enums.AccountType.CONTRACTOR,
      contractorKind: $Enums.ContractorKind.INDIVIDUAL,
      personalDetails: {
        legalStatus: null,
        taxId: `123`,
        passportOrIdNumber: `id123`,
        phoneNumber: null,
      },
    });
    await expect(service.assertProfileCompleteForVerification(consumerId)).rejects.toThrow(BadRequestException);
    await expect(service.assertProfileCompleteForVerification(consumerId)).rejects.toThrow(
      errorCodes.PROFILE_INCOMPLETE_VERIFY,
    );
  });

  it(`throws PROFILE_INCOMPLETE_VERIFY when entity missing phoneNumber`, async () => {
    const { service } = makeService({
      id: consumerId,
      accountType: $Enums.AccountType.BUSINESS,
      contractorKind: null,
      personalDetails: {
        legalStatus: $Enums.LegalStatus.INDIVIDUAL,
        taxId: `tax1`,
        passportOrIdNumber: null,
        phoneNumber: null,
      },
    });
    await expect(service.assertProfileCompleteForVerification(consumerId)).rejects.toThrow(BadRequestException);
    await expect(service.assertProfileCompleteForVerification(consumerId)).rejects.toThrow(
      errorCodes.PROFILE_INCOMPLETE_VERIFY,
    );
  });

  it(`does not throw when individual contractor profile complete`, async () => {
    const { service } = makeService({
      id: consumerId,
      accountType: $Enums.AccountType.CONTRACTOR,
      contractorKind: $Enums.ContractorKind.INDIVIDUAL,
      personalDetails: {
        legalStatus: $Enums.LegalStatus.INDIVIDUAL,
        taxId: `tax1`,
        passportOrIdNumber: `id1`,
        phoneNumber: null,
      },
    });
    await expect(service.assertProfileCompleteForVerification(consumerId)).resolves.toBeUndefined();
  });

  it(`does not throw when business profile complete`, async () => {
    const { service } = makeService({
      id: consumerId,
      accountType: $Enums.AccountType.BUSINESS,
      contractorKind: null,
      personalDetails: {
        taxId: `tax1`,
        phoneNumber: `+15551234567`,
      },
    });
    await expect(service.assertProfileCompleteForVerification(consumerId)).resolves.toBeUndefined();
  });

  it(`does not throw when contractor entity profile complete`, async () => {
    const { service } = makeService({
      id: consumerId,
      accountType: $Enums.AccountType.CONTRACTOR,
      contractorKind: $Enums.ContractorKind.ENTITY,
      personalDetails: {
        taxId: `tax1`,
        phoneNumber: `+15551234567`,
      },
    });
    await expect(service.assertProfileCompleteForVerification(consumerId)).resolves.toBeUndefined();
  });

  it(`does not throw when consumer not found (no-op)`, async () => {
    const { service } = makeService(null);
    await expect(service.assertProfileCompleteForVerification(consumerId)).resolves.toBeUndefined();
  });
});

describe(`ConsumerPaymentsService.getHistory`, () => {
  const consumerId = `consumer-1`;

  it(`walks multiple batches so total and offset stay truthful after ledger collapse`, async () => {
    const makeRow = (index: number) => ({
      id: `entry-${index}`,
      ledgerId: `ledger-${index}`,
      consumerId,
      type: $Enums.LedgerEntryType.USER_PAYMENT,
      amount: -index,
      status: $Enums.TransactionStatus.COMPLETED,
      currencyCode: $Enums.CurrencyCode.USD,
      createdAt: new Date(`2026-03-01T12:${String(300 - index).padStart(2, `0`)}:00.000Z`),
      metadata: {},
      paymentRequestId: null,
      paymentRequest: null,
      outcomes: [],
    });
    const firstBatch = Array.from({ length: 200 }, (_, index) => makeRow(203 - index));
    const secondBatch = Array.from({ length: 3 }, (_, index) => makeRow(3 - index));
    const findMany = jest.fn().mockResolvedValueOnce(firstBatch).mockResolvedValueOnce(secondBatch);
    const prisma = {
      ledgerEntryModel: { findMany },
      paymentMethodModel: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);

    const result = await service.getHistory(consumerId, { limit: 2, offset: 1 });

    expect(result.total).toBe(203);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.ledgerId).toBe(`ledger-202`);
    expect(result.items[1]?.ledgerId).toBe(`ledger-201`);
    expect(findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        skip: 0,
        take: 200,
      }),
    );
    expect(findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        skip: 200,
        take: 200,
      }),
    );
  });

  it(`uses latest outcome status for returned history items and status filtering`, async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: `entry-1`,
        ledgerId: `ledger-1`,
        consumerId,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        amount: -25,
        status: $Enums.TransactionStatus.PENDING,
        currencyCode: $Enums.CurrencyCode.USD,
        createdAt: new Date(`2026-03-01T12:00:00.000Z`),
        metadata: { paymentMethodId: `pm-bank-1` },
        paymentRequestId: `pr-1`,
        paymentRequest: { paymentRail: $Enums.PaymentRail.BANK_TRANSFER },
        outcomes: [{ status: $Enums.TransactionStatus.COMPLETED }],
      },
    ]);
    const prisma = {
      ledgerEntryModel: { findMany },
      paymentMethodModel: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `pm-bank-1`,
            brand: `History Temp Bank`,
            last4: `5511`,
          },
        ]),
      },
    } as any;
    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);

    const result = await service.getHistory(consumerId, {
      limit: 20,
      offset: 0,
      status: $Enums.TransactionStatus.COMPLETED,
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.status).toBe($Enums.TransactionStatus.COMPLETED);
    expect(result.items[0]?.rail).toBe($Enums.PaymentRail.BANK_TRANSFER);
    expect(result.items[0]?.paymentMethodId).toBe(`pm-bank-1`);
    expect(result.items[0]?.paymentMethodLabel).toBe(`History Temp Bank •••• 5511`);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          outcomes: {
            orderBy: { createdAt: `desc` },
            take: 1,
            select: { status: true },
          },
          paymentRequest: {
            select: { paymentRail: true },
          },
        },
      }),
    );
  });

  it(`normalizes deposit settlement rows back to product payment type in history`, async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: `entry-deposit-history`,
        ledgerId: `ledger-deposit-history`,
        consumerId,
        type: $Enums.LedgerEntryType.USER_DEPOSIT,
        amount: 30,
        status: $Enums.TransactionStatus.COMPLETED,
        currencyCode: $Enums.CurrencyCode.USD,
        createdAt: new Date(`2026-03-01T14:00:00.000Z`),
        metadata: {},
        paymentRequestId: `pr-deposit-history`,
        paymentRequest: { paymentRail: $Enums.PaymentRail.CARD },
        outcomes: [],
      },
    ]);
    const prisma = {
      ledgerEntryModel: { findMany },
      paymentMethodModel: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);

    const result = await service.getHistory(consumerId, { limit: 20, offset: 0 });

    expect(result.items[0]?.type).toBe($Enums.LedgerEntryType.USER_PAYMENT);
  });

  it(`filters by normalized history type after collapse`, async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: `entry-deposit-history`,
        ledgerId: `ledger-deposit-history`,
        consumerId,
        type: $Enums.LedgerEntryType.USER_DEPOSIT,
        amount: 30,
        status: $Enums.TransactionStatus.COMPLETED,
        currencyCode: $Enums.CurrencyCode.USD,
        createdAt: new Date(`2026-03-01T14:00:00.000Z`),
        metadata: {},
        paymentRequestId: `pr-deposit-history`,
        paymentRequest: { paymentRail: $Enums.PaymentRail.CARD },
        outcomes: [],
      },
    ]);
    const prisma = {
      ledgerEntryModel: { findMany },
      paymentMethodModel: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);

    const result = await service.getHistory(consumerId, {
      limit: 20,
      offset: 0,
      type: $Enums.LedgerEntryType.USER_PAYMENT,
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.type).toBe($Enums.LedgerEntryType.USER_PAYMENT);
  });

  it(`filters direction from the collapsed visible row instead of raw multi-leg ledger entries`, async () => {
    const rows = [
      {
        id: `entry-exchange-income`,
        ledgerId: `ledger-exchange-1`,
        consumerId,
        type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
        amount: 10,
        status: $Enums.TransactionStatus.COMPLETED,
        currencyCode: $Enums.CurrencyCode.USD,
        createdAt: new Date(`2026-03-01T15:00:01.000Z`),
        metadata: { from: $Enums.CurrencyCode.EUR, to: $Enums.CurrencyCode.USD },
        paymentRequestId: null,
        paymentRequest: null,
        outcomes: [],
      },
      {
        id: `entry-exchange-outcome`,
        ledgerId: `ledger-exchange-1`,
        consumerId,
        type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
        amount: -9.5,
        status: $Enums.TransactionStatus.COMPLETED,
        currencyCode: $Enums.CurrencyCode.EUR,
        createdAt: new Date(`2026-03-01T15:00:00.000Z`),
        metadata: { from: $Enums.CurrencyCode.EUR, to: $Enums.CurrencyCode.USD },
        paymentRequestId: null,
        paymentRequest: null,
        outcomes: [],
      },
    ];
    const findMany = jest.fn().mockResolvedValue(rows);
    const prisma = {
      ledgerEntryModel: { findMany },
      paymentMethodModel: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);

    const incomeResult = await service.getHistory(consumerId, {
      limit: 20,
      offset: 0,
      direction: `INCOME`,
    });
    const outcomeResult = await service.getHistory(consumerId, {
      limit: 20,
      offset: 0,
      direction: `OUTCOME`,
    });

    expect(incomeResult.total).toBe(1);
    expect(incomeResult.items[0]).toEqual(
      expect.objectContaining({
        id: `entry-exchange-income`,
        ledgerId: `ledger-exchange-1`,
        direction: `INCOME`,
        currencyCode: $Enums.CurrencyCode.USD,
        amount: 10,
      }),
    );
    expect(outcomeResult.total).toBe(0);
    expect(outcomeResult.items).toEqual([]);
  });
});

describe(`ConsumerPaymentsService.getBalancesIncludePending`, () => {
  const consumerId = `consumer-1`;

  it(`calls balanceService.calculateMultiCurrency with COMPLETED_AND_PENDING and returns balances`, async () => {
    const balances = { [$Enums.CurrencyCode.USD]: 75, [$Enums.CurrencyCode.EUR]: 20 };
    const balanceService = {
      calculateMultiCurrency: jest
        .fn()
        .mockResolvedValue({ balances, mode: `COMPLETED_AND_PENDING`, calculatedAt: new Date() }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const prisma = {} as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);

    const result = await service.getBalancesIncludePending(consumerId);

    expect(balanceService.calculateMultiCurrency).toHaveBeenCalledWith(consumerId, {
      mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
    });
    expect(result).toEqual(balances);
    expect(result.USD).toBe(75);
    expect(result.EUR).toBe(20);
  });
});

describe(`ConsumerPaymentsService.getTodayOutgoingTotal`, () => {
  const consumerId = `consumer-1`;

  it(`applies wallet eligibility rule so card-funded payer debits do not consume wallet daily limits`, async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ total: `0` }]),
    } as any;
    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);

    await (service as any).getTodayOutgoingTotal(consumerId);

    const query = prisma.$queryRaw.mock.calls[0][0] as { sql?: string; values?: unknown[] };
    expect(query.sql).toContain(`LEFT JOIN payment_request pr ON pr.id = le.payment_request_id`);
    expect(query.sql).toContain(`pr.payment_rail::text`);
    expect(query.values).toEqual(
      expect.arrayContaining([
        $Enums.LedgerEntryType.USER_PAYMENT,
        $Enums.PaymentRail.CARD,
        $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
        $Enums.PaymentRail.STRIPE_REFUND,
        $Enums.PaymentRail.STRIPE_CHARGEBACK,
      ]),
    );
  });

  it(`counts only user-initiated outgoing types for daily limits`, async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ total: `0` }]),
    } as any;
    const balanceService = {
      calculateMultiCurrency: jest.fn().mockResolvedValue({ balances: {} }),
      calculateSingle: jest.fn().mockResolvedValue({ balance: 100 }),
      calculateInTransaction: jest.fn().mockResolvedValue(100),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any, balanceService);

    await (service as any).getTodayOutgoingTotal(consumerId);

    const query = prisma.$queryRaw.mock.calls[0][0] as { sql?: string; values?: unknown[] };
    expect(query.sql).toContain(`le.type::text IN`);
    expect(query.values).toEqual(
      expect.arrayContaining([$Enums.LedgerEntryType.USER_PAYMENT, $Enums.LedgerEntryType.USER_PAYOUT]),
    );
  });
});
