/** @jest-environment @remoola/test-db/environment */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { $Enums } from '@remoola/database-2';

import { ConsumerPaymentsQueriesService } from './consumer-payments-queries.service';
import { createPrismaTestContext } from '../../../../test/helpers/prisma-test-context';

describe(`ConsumerPaymentsQueriesService DB smoke`, () => {
  const prismaContext = createPrismaTestContext();
  const { prisma } = prismaContext;
  const service = new ConsumerPaymentsQueriesService(prisma as any, {
    calculateMultiCurrency: async () => ({ balances: {} }),
    calculateSingle: async () => ({ balance: 0 }),
  } as any);

  let listOwnerId = ``;
  let waitingOlderId = ``;
  let waitingNewerId = ``;

  let historyOwnerId = ``;
  let historyLatestWaitingId = ``;
  let historyLatestNormalizedDepositId = ``;
  let historyLatestWaitingLedgerId = ``;
  let historyLatestNormalizedDepositLedgerId = ``;

  beforeAll(async () => {
    await prismaContext.connect();

    const listOwner = await prisma.consumerModel.create({
      data: {
        email: `payments-list-owner@local.test`,
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.INDIVIDUAL,
      },
    });
    listOwnerId = listOwner.id;

    const waitingOlder = await prisma.paymentRequestModel.create({
      data: {
        amount: 12,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.PENDING,
        type: $Enums.TransactionType.BANK_TRANSFER,
        paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
        requesterId: listOwner.id,
        payerEmail: `older-counterparty@local.test`,
        description: `waiting older`,
        createdAt: new Date(`2026-05-04T09:00:00.000Z`),
        updatedAt: new Date(`2026-05-04T09:00:00.000Z`),
      },
    });
    waitingOlderId = waitingOlder.id;

    const waitingNewer = await prisma.paymentRequestModel.create({
      data: {
        amount: 15,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.WAITING,
        type: $Enums.TransactionType.BANK_TRANSFER,
        paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
        requesterId: listOwner.id,
        payerEmail: `newer-counterparty@local.test`,
        description: `waiting newer`,
        createdAt: new Date(`2026-05-04T10:00:00.000Z`),
        updatedAt: new Date(`2026-05-04T10:00:00.000Z`),
      },
    });
    waitingNewerId = waitingNewer.id;

    await prisma.paymentRequestModel.create({
      data: {
        amount: 20,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.COMPLETED,
        type: $Enums.TransactionType.BANK_TRANSFER,
        paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
        requesterId: listOwner.id,
        payerEmail: `completed-counterparty@local.test`,
        description: `completed payment`,
        createdAt: new Date(`2026-05-04T08:00:00.000Z`),
        updatedAt: new Date(`2026-05-04T08:00:00.000Z`),
      },
    });

    const waitingOlderEntry = await prisma.ledgerEntryModel.create({
      data: {
        ledgerId: `00000000-0000-4000-8000-000000000201`,
        consumerId: listOwner.id,
        paymentRequestId: waitingOlder.id,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.PENDING,
        amount: -12,
        metadata: {},
        createdAt: new Date(`2026-05-04T09:00:00.000Z`),
        updatedAt: new Date(`2026-05-04T09:00:00.000Z`),
      },
    });

    await prisma.ledgerEntryOutcomeModel.create({
      data: {
        ledgerEntryId: waitingOlderEntry.id,
        status: $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
        source: `payments-db-smoke-list`,
        externalId: `payments-db-smoke-list-older`,
        createdAt: new Date(`2026-05-04T09:01:00.000Z`),
      },
    });

    await prisma.ledgerEntryModel.create({
      data: {
        ledgerId: `00000000-0000-4000-8000-000000000202`,
        consumerId: listOwner.id,
        paymentRequestId: waitingNewer.id,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.WAITING,
        amount: -15,
        metadata: {},
        createdAt: new Date(`2026-05-04T10:00:00.000Z`),
        updatedAt: new Date(`2026-05-04T10:00:00.000Z`),
      },
    });

    const historyOwner = await prisma.consumerModel.create({
      data: {
        email: `payments-history-owner@local.test`,
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.INDIVIDUAL,
      },
    });
    historyOwnerId = historyOwner.id;

    const historyWaitingRequest = await prisma.paymentRequestModel.create({
      data: {
        amount: 30,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.PENDING,
        type: $Enums.TransactionType.BANK_TRANSFER,
        paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
        requesterId: historyOwner.id,
        payerEmail: `history-waiting@local.test`,
        description: `history waiting`,
        createdAt: new Date(`2026-05-06T11:00:00.000Z`),
        updatedAt: new Date(`2026-05-06T11:00:00.000Z`),
      },
    });

    const historyDepositRequest = await prisma.paymentRequestModel.create({
      data: {
        amount: 22,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.COMPLETED,
        type: $Enums.TransactionType.BANK_TRANSFER,
        paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
        requesterId: historyOwner.id,
        payerEmail: `history-deposit@local.test`,
        description: `history deposit`,
        createdAt: new Date(`2026-05-05T12:00:00.000Z`),
        updatedAt: new Date(`2026-05-05T12:00:00.000Z`),
      },
    });

    historyLatestWaitingLedgerId = `00000000-0000-4000-8000-000000000301`;
    await prisma.ledgerEntryModel.create({
      data: {
        ledgerId: historyLatestWaitingLedgerId,
        consumerId: historyOwner.id,
        paymentRequestId: historyWaitingRequest.id,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.COMPLETED,
        amount: -30,
        metadata: {},
        createdAt: new Date(`2026-05-06T09:00:00.000Z`),
        updatedAt: new Date(`2026-05-06T09:00:00.000Z`),
      },
    });

    const latestWaitingEntry = await prisma.ledgerEntryModel.create({
      data: {
        ledgerId: historyLatestWaitingLedgerId,
        consumerId: historyOwner.id,
        paymentRequestId: historyWaitingRequest.id,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.PENDING,
        amount: -30,
        metadata: {},
        createdAt: new Date(`2026-05-06T11:00:00.000Z`),
        updatedAt: new Date(`2026-05-06T11:00:00.000Z`),
      },
    });
    historyLatestWaitingId = latestWaitingEntry.id;

    await prisma.ledgerEntryOutcomeModel.create({
      data: {
        ledgerEntryId: latestWaitingEntry.id,
        status: $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
        source: `payments-db-smoke-history`,
        externalId: `payments-db-smoke-history-waiting`,
        createdAt: new Date(`2026-05-06T11:01:00.000Z`),
      },
    });

    historyLatestNormalizedDepositLedgerId = `00000000-0000-4000-8000-000000000302`;
    await prisma.ledgerEntryModel.create({
      data: {
        ledgerId: historyLatestNormalizedDepositLedgerId,
        consumerId: historyOwner.id,
        paymentRequestId: historyDepositRequest.id,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.PENDING,
        amount: 22,
        metadata: {},
        createdAt: new Date(`2026-05-05T10:00:00.000Z`),
        updatedAt: new Date(`2026-05-05T10:00:00.000Z`),
      },
    });

    const latestNormalizedDepositEntry = await prisma.ledgerEntryModel.create({
      data: {
        ledgerId: historyLatestNormalizedDepositLedgerId,
        consumerId: historyOwner.id,
        paymentRequestId: historyDepositRequest.id,
        type: $Enums.LedgerEntryType.USER_DEPOSIT,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.COMPLETED,
        amount: 22,
        metadata: {},
        createdAt: new Date(`2026-05-05T12:00:00.000Z`),
        updatedAt: new Date(`2026-05-05T12:00:00.000Z`),
      },
    });
    historyLatestNormalizedDepositId = latestNormalizedDepositEntry.id;
  });

  afterAll(async () => {
    await prismaContext.disconnect();
  });

  it(`returns DB-backed payment pages and totals from the raw status-filter path`, async () => {
    const result = await service.listPayments({
      consumerId: listOwnerId,
      page: 2,
      pageSize: 1,
      status: $Enums.TransactionStatus.WAITING,
    });

    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: waitingOlderId,
        status: $Enums.TransactionStatus.WAITING,
        role: `REQUESTER`,
        latestTransaction: expect.objectContaining({
          status: $Enums.TransactionStatus.WAITING,
        }),
      }),
    );
  });

  it(`returns DB-backed history pages from the raw no-status branch after ledger collapse`, async () => {
    const result = await service.getHistory(historyOwnerId, {
      limit: 1,
      offset: 1,
    });

    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: historyLatestNormalizedDepositId,
        ledgerId: historyLatestNormalizedDepositLedgerId,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        status: $Enums.TransactionStatus.COMPLETED,
        paymentRequestId: expect.any(String),
      }),
    );
  });

  it(`returns DB-backed history rows from the raw effective-status filter branch`, async () => {
    const result = await service.getHistory(historyOwnerId, {
      status: $Enums.TransactionStatus.WAITING,
      limit: 10,
      offset: 0,
    });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: historyLatestWaitingId,
        ledgerId: historyLatestWaitingLedgerId,
        status: $Enums.TransactionStatus.WAITING,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
      }),
    );
  });
});
