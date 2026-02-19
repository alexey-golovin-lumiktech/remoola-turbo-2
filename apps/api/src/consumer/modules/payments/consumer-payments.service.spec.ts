import { BadRequestException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { ConsumerPaymentsService } from './consumer-payments.service';
import { TransferBody, WithdrawBody } from './dto';

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
    const service = new ConsumerPaymentsService(prisma, mailingService);

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

    const service = new ConsumerPaymentsService(prisma, mailingService);
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

    const result = await service.sendPaymentRequest(consumerId, `pr-1`);

    expect(result).toEqual({ paymentRequestId: `pr-1` });
    expect(tx.ledgerEntryModel.create).toHaveBeenCalledTimes(2);
    expect(tx.ledgerEntryModel.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          paymentRequestId: `pr-1`,
          consumerId: `payer-1`,
          amount: -55.25,
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
        }),
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

    const result = await service.sendPaymentRequest(consumerId, `pr-2`);

    expect(result).toEqual({ paymentRequestId: `pr-2` });
    expect(tx.ledgerEntryModel.create).not.toHaveBeenCalled();
    expect(mailingService.sendPaymentRequestEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        payerEmail: `outside@example.com`,
        requesterEmail,
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

    const service = new ConsumerPaymentsService(prisma, {} as any);
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
});

describe(`ConsumerPaymentsService.withdraw`, () => {
  const consumerId = `consumer-1`;

  it(`throws when idempotency key is missing`, async () => {
    const prisma = { ledgerEntryModel: {}, $transaction: jest.fn() } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any);
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
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue(undefined),
          ledgerEntryModel: {
            aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 500 } }),
            create: jest.fn().mockResolvedValue(existingEntry),
          },
        };
        return fn(tx);
      }),
    } as any;

    const service = new ConsumerPaymentsService(prisma, {} as any);
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
});

describe(`ConsumerPaymentsService.transfer`, () => {
  const consumerId = `consumer-1`;

  it(`throws when idempotency key is missing`, async () => {
    const prisma = {
      consumerModel: { findFirst: jest.fn().mockResolvedValue({ id: `r1`, email: `r@x.com` }) },
      ledgerEntryModel: {},
      $transaction: jest.fn(),
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any);
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

  it(`returns same ledgerId when idempotency key is reused`, async () => {
    const existingEntry = {
      id: `entry-1`,
      ledgerId: `ledger-1`,
      consumerId,
      type: $Enums.LedgerEntryType.USER_PAYMENT,
      idempotencyKey: `transfer:key-1:sender`,
      deletedAt: null,
    };

    const prisma = {
      consumerModel: {
        findFirst: jest.fn().mockResolvedValue({ id: `recipient-1`, email: `r@example.com` }),
      },
      ledgerEntryModel: {
        findFirst: jest.fn().mockResolvedValue(null).mockResolvedValueOnce(existingEntry),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 500 } }),
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((fn: (tx: any) => Promise<any>) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue(undefined),
          ledgerEntryModel: {
            aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 500 } }),
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return fn(tx);
      }),
    } as any;

    const service = new ConsumerPaymentsService(prisma, {} as any);
    (service as any).ensureLimits = jest.fn().mockResolvedValue(undefined);

    const body: TransferBody = { amount: 50, recipient: `r@example.com` };
    const first = await service.transfer(consumerId, body, `key-1`);
    prisma.ledgerEntryModel.findFirst.mockResolvedValue(existingEntry);
    const second = await service.transfer(consumerId, body, `key-1`);

    expect(first.ledgerId).toBeDefined();
    expect(second.ledgerId).toBe(`ledger-1`);
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
});

describe(`ConsumerPaymentsService.getHistory`, () => {
  const consumerId = `consumer-1`;

  it(`uses bounded findMany (take cap 2000)`, async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      ledgerEntryModel: { findMany },
    } as any;
    const service = new ConsumerPaymentsService(prisma, {} as any);

    await service.getHistory(consumerId, { limit: 20, offset: 0 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: expect.any(Number),
      }),
    );
    const takeArg = (findMany.mock.calls[0][0] as { take: number }).take;
    expect(takeArg).toBeLessThanOrEqual(2000);
    expect(takeArg).toBeGreaterThan(0);
  });
});
