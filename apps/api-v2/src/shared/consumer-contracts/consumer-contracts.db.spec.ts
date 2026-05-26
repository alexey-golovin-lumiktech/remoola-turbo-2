/** @jest-environment @remoola/test-db/environment */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { $Enums } from '@remoola/database-2';

import {
  normalizeContractPresenceFilter,
  normalizeContractSort,
  normalizeContractStatusFilter,
} from './consumer-contract-normalizers';
import { ConsumerContractsInMemoryQuery } from './consumer-contracts-in-memory.query';
import { ConsumerContractsQuery } from './consumer-contracts.query';
import { ConsumerContractsService } from './consumer-contracts.service';
import { type ConsumerContractItem } from './dto';
import { createPrismaTestContext } from '../../../test/helpers/prisma-test-context';

class RawDisabledConsumerContractsQuery extends ConsumerContractsQuery {
  override async getContractsRaw(): Promise<never> {
    throw new Error(`raw contracts query disabled for parity test`);
  }
}

type ContractListResult = {
  items: ConsumerContractItem[];
  total: number;
  page: number;
  pageSize: number;
};

type NormalizedContractListResult = {
  items: Array<{
    id: string;
    email: string;
    lastRequestId: string | null;
    lastStatus: string | null;
    lastActivity: string | null;
    docs: number;
    paymentsCount: number;
    completedPaymentsCount: number;
  }>;
  total: number;
  page: number;
  pageSize: number;
};

function normalizeContractsResult(result: ContractListResult): NormalizedContractListResult {
  return {
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    items: result.items.map((item) => ({
      id: item.id,
      email: item.email,
      lastRequestId: item.lastRequestId,
      lastStatus: item.lastStatus,
      lastActivity: item.lastActivity?.toISOString() ?? null,
      docs: item.docs,
      paymentsCount: item.paymentsCount,
      completedPaymentsCount: item.completedPaymentsCount,
    })),
  };
}

describe(`ConsumerContractsService DB smoke`, () => {
  const prismaContext = createPrismaTestContext();
  const { prisma } = prismaContext;
  const rawQuery = new ConsumerContractsQuery(prisma as any);
  const fallbackQuery = new RawDisabledConsumerContractsQuery(prisma as any);
  const rawService = new ConsumerContractsService(rawQuery);
  const fallbackQueryHelper = new ConsumerContractsInMemoryQuery(fallbackQuery);

  let ownerId = ``;
  const paymentIdsByContactEmail = new Map<string, string[]>();

  async function createContact(params: { email: string; name: string; updatedAt: Date }) {
    return prisma.contactModel.create({
      data: {
        consumerId: ownerId,
        email: params.email,
        name: params.name,
        address: { country: `US` },
        createdAt: params.updatedAt,
        updatedAt: params.updatedAt,
      },
    });
  }

  async function createResource(name: string) {
    return prisma.resourceModel.create({
      data: {
        access: $Enums.ResourceAccess.PRIVATE,
        originalName: name,
        mimetype: `application/pdf`,
        size: 128,
        bucket: `local`,
        key: `contracts/${name}`,
        downloadUrl: `legacy://${name}`,
      },
    });
  }

  async function createPayment(params: {
    contactEmail: string;
    status: $Enums.TransactionStatus;
    amount: number;
    createdAt: Date;
    updatedAt: Date;
    ledgerId: string;
    outcomeStatus?: $Enums.TransactionStatus;
    resourceId?: string;
  }) {
    const paymentRequest = await prisma.paymentRequestModel.create({
      data: {
        amount: params.amount,
        currencyCode: $Enums.CurrencyCode.USD,
        status: params.status,
        paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
        requesterId: ownerId,
        payerEmail: params.contactEmail,
        description: `contracts parity ${params.contactEmail}`,
        createdAt: params.createdAt,
        updatedAt: params.updatedAt,
      },
    });
    paymentIdsByContactEmail.set(params.contactEmail, [
      ...(paymentIdsByContactEmail.get(params.contactEmail) ?? []),
      paymentRequest.id,
    ]);

    const ledgerEntry = await prisma.ledgerEntryModel.create({
      data: {
        ledgerId: params.ledgerId,
        consumerId: ownerId,
        paymentRequestId: paymentRequest.id,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        currencyCode: $Enums.CurrencyCode.USD,
        status: params.status,
        amount: -params.amount,
        metadata: { tag: `contracts-parity` },
        createdAt: params.createdAt,
        updatedAt: params.updatedAt,
      },
    });

    if (params.outcomeStatus) {
      await prisma.ledgerEntryOutcomeModel.create({
        data: {
          ledgerEntryId: ledgerEntry.id,
          status: params.outcomeStatus,
          source: `contracts-db-parity`,
          externalId: `contracts-db-parity-${paymentRequest.id}`,
          createdAt: new Date(params.updatedAt.getTime() + 60_000),
        },
      });
    }

    if (params.resourceId) {
      await prisma.paymentRequestAttachmentModel.create({
        data: {
          paymentRequestId: paymentRequest.id,
          requesterId: ownerId,
          resourceId: params.resourceId,
        },
      });
    }

    return paymentRequest;
  }

  async function expectRawFallbackParity(params: {
    page?: number;
    pageSize?: number;
    query?: string;
    status?: string;
    hasDocuments?: string;
    hasPayments?: string;
    sort?: string;
  }) {
    const raw = await rawService.getContracts(
      ownerId,
      params.page,
      params.pageSize,
      params.query,
      params.status,
      params.hasDocuments,
      params.hasPayments,
      params.sort,
    );
    const fallback = await fallbackQueryHelper.getContracts({
      consumerId: ownerId,
      safePage: Math.max(1, Math.floor(Number(params.page)) || 1),
      safePageSize: Math.min(100, Math.max(1, Math.floor(Number(params.pageSize)) || 10)),
      term: params.query?.trim() ?? ``,
      normalizedStatusFilter: normalizeContractStatusFilter(params.status),
      normalizedHasDocumentsFilter: normalizeContractPresenceFilter(params.hasDocuments),
      normalizedHasPaymentsFilter: normalizeContractPresenceFilter(params.hasPayments),
      normalizedSort: normalizeContractSort(params.sort),
    });

    expect(normalizeContractsResult(raw)).toEqual(normalizeContractsResult(fallback));
    return raw;
  }

  beforeAll(async () => {
    await prismaContext.connect();

    const owner = await prisma.consumerModel.create({
      data: {
        email: `contracts-owner@local.test`,
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.INDIVIDUAL,
      },
    });
    ownerId = owner.id;

    await createContact({
      email: `alpha-completed@local.test`,
      name: `Alpha Completed`,
      updatedAt: new Date(`2026-05-01T09:00:00.000Z`),
    });
    await createContact({
      email: `bravo-waiting@local.test`,
      name: `Bravo Waiting`,
      updatedAt: new Date(`2026-05-01T10:00:00.000Z`),
    });
    await createContact({
      email: `charlie-draft@local.test`,
      name: `Charlie Draft`,
      updatedAt: new Date(`2026-05-01T11:00:00.000Z`),
    });
    await createContact({
      email: `delta-pending@local.test`,
      name: `Delta Pending`,
      updatedAt: new Date(`2026-05-01T12:00:00.000Z`),
    });
    await createContact({
      email: `echo-no-activity@local.test`,
      name: `Echo No Activity`,
      updatedAt: new Date(`2026-05-01T13:00:00.000Z`),
    });

    const sharedResource = await createResource(`contracts-shared-proof.pdf`);
    const waitingResource = await createResource(`contracts-waiting-proof.pdf`);

    await createPayment({
      contactEmail: `alpha-completed@local.test`,
      status: $Enums.TransactionStatus.COMPLETED,
      amount: 25,
      createdAt: new Date(`2026-05-02T08:00:00.000Z`),
      updatedAt: new Date(`2026-05-02T08:00:00.000Z`),
      ledgerId: `00000000-0000-4000-8000-000000000101`,
      resourceId: sharedResource.id,
    });
    await createPayment({
      contactEmail: `alpha-completed@local.test`,
      status: $Enums.TransactionStatus.COMPLETED,
      amount: 35,
      createdAt: new Date(`2026-05-02T09:00:00.000Z`),
      updatedAt: new Date(`2026-05-02T09:00:00.000Z`),
      ledgerId: `00000000-0000-4000-8000-000000000102`,
      resourceId: sharedResource.id,
    });
    await createPayment({
      contactEmail: `bravo-waiting@local.test`,
      status: $Enums.TransactionStatus.PENDING,
      amount: 40,
      createdAt: new Date(`2026-05-03T08:00:00.000Z`),
      updatedAt: new Date(`2026-05-03T08:00:00.000Z`),
      ledgerId: `00000000-0000-4000-8000-000000000103`,
      outcomeStatus: $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
      resourceId: waitingResource.id,
    });
    await createPayment({
      contactEmail: `charlie-draft@local.test`,
      status: $Enums.TransactionStatus.DRAFT,
      amount: 50,
      createdAt: new Date(`2026-05-04T08:00:00.000Z`),
      updatedAt: new Date(`2026-05-04T08:00:00.000Z`),
      ledgerId: `00000000-0000-4000-8000-000000000104`,
    });
    await createPayment({
      contactEmail: `delta-pending@local.test`,
      status: $Enums.TransactionStatus.PENDING,
      amount: 60,
      createdAt: new Date(`2026-05-05T08:00:00.000Z`),
      updatedAt: new Date(`2026-05-05T08:00:00.000Z`),
      ledgerId: `00000000-0000-4000-8000-000000000105`,
    });
  });

  afterAll(async () => {
    await prismaContext.disconnect();
  });

  it(`returns DB-backed contract pages and totals from the raw read model`, async () => {
    const firstPage = await rawService.getContracts(ownerId, 1, 1, undefined, undefined, undefined, `yes`);
    const secondPage = await rawService.getContracts(ownerId, 2, 1, undefined, undefined, undefined, `yes`);

    expect(firstPage.total).toBe(4);
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.items[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: `Delta Pending`,
        email: `delta-pending@local.test`,
        lastRequestId: paymentIdsByContactEmail.get(`delta-pending@local.test`)?.[0],
        lastStatus: `pending`,
        docs: 0,
        paymentsCount: 1,
        completedPaymentsCount: 0,
      }),
    );

    expect(secondPage.total).toBe(4);
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.items[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: `Charlie Draft`,
        email: `charlie-draft@local.test`,
        lastRequestId: paymentIdsByContactEmail.get(`charlie-draft@local.test`)?.[0],
        lastStatus: `draft`,
        docs: 0,
        paymentsCount: 1,
        completedPaymentsCount: 0,
      }),
    );
  });

  it.each([`draft`, `pending`, `waiting`, `completed`, `no_activity`])(
    `keeps raw and in-memory contract status filter parity for %s`,
    async (status) => {
      const result = await expectRawFallbackParity({ status });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].lastStatus).toBe(status === `no_activity` ? null : status);
    },
  );

  it.each([
    [`hasDocuments=yes`, { hasDocuments: `yes` }, [`bravo-waiting@local.test`, `alpha-completed@local.test`]],
    [
      `hasDocuments=no`,
      { hasDocuments: `no` },
      [`delta-pending@local.test`, `charlie-draft@local.test`, `echo-no-activity@local.test`],
    ],
    [
      `hasPayments=yes`,
      { hasPayments: `yes` },
      [
        `delta-pending@local.test`,
        `charlie-draft@local.test`,
        `bravo-waiting@local.test`,
        `alpha-completed@local.test`,
      ],
    ],
    [`hasPayments=no`, { hasPayments: `no` }, [`echo-no-activity@local.test`]],
  ])(`keeps raw and in-memory presence filter parity for %s`, async (_label, params, expectedEmails) => {
    const result = await expectRawFallbackParity(params);

    expect(result.items.map((item) => item.email)).toEqual(expectedEmails);
  });

  it.each([
    [`recent_activity`, [`delta-pending@local.test`, `charlie-draft@local.test`, `bravo-waiting@local.test`]],
    [`name`, [`alpha-completed@local.test`, `bravo-waiting@local.test`, `charlie-draft@local.test`]],
    [`payments_count`, [`alpha-completed@local.test`, `delta-pending@local.test`, `charlie-draft@local.test`]],
  ])(`keeps raw and in-memory sort parity for %s`, async (sort, expectedLeadingEmails) => {
    const result = await expectRawFallbackParity({ sort, pageSize: 5 });

    expect(result.items.map((item) => item.email).slice(0, expectedLeadingEmails.length)).toEqual(
      expectedLeadingEmails,
    );
  });

  it(`keeps distinct document count parity when multiple payments attach the same resource`, async () => {
    const result = await expectRawFallbackParity({ query: `alpha-completed` });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        email: `alpha-completed@local.test`,
        docs: 1,
        paymentsCount: 2,
        completedPaymentsCount: 2,
      }),
    );
  });
});
