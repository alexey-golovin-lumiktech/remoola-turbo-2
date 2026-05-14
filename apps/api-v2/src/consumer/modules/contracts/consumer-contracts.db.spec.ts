/** @jest-environment @remoola/test-db/environment */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { $Enums } from '@remoola/database-2';

import { ConsumerContractsQuery } from './consumer-contracts.query';
import { ConsumerContractsService } from './consumer-contracts.service';
import { createPrismaTestContext } from '../../../../test/helpers/prisma-test-context';

describe(`ConsumerContractsService DB smoke`, () => {
  const prismaContext = createPrismaTestContext();
  const { prisma } = prismaContext;
  const service = new ConsumerContractsService(new ConsumerContractsQuery(prisma as any));

  let ownerId = ``;
  let alphaRequestId = ``;
  let bravoRequestId = ``;

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

    const alphaContact = await prisma.contactModel.create({
      data: {
        consumerId: owner.id,
        email: `alpha-vendor@local.test`,
        name: `Alpha Vendor`,
        address: { country: `US` },
        createdAt: new Date(`2026-05-01T09:00:00.000Z`),
        updatedAt: new Date(`2026-05-01T09:00:00.000Z`),
      },
    });

    const bravoContact = await prisma.contactModel.create({
      data: {
        consumerId: owner.id,
        email: `bravo-vendor@local.test`,
        name: `Bravo Vendor`,
        address: { country: `US` },
        createdAt: new Date(`2026-05-01T10:00:00.000Z`),
        updatedAt: new Date(`2026-05-01T10:00:00.000Z`),
      },
    });

    await prisma.contactModel.create({
      data: {
        consumerId: owner.id,
        email: `no-payments@local.test`,
        name: `No Payments`,
        address: { country: `US` },
        createdAt: new Date(`2026-05-01T11:00:00.000Z`),
        updatedAt: new Date(`2026-05-01T11:00:00.000Z`),
      },
    });

    const alphaRequest = await prisma.paymentRequestModel.create({
      data: {
        amount: 25,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.COMPLETED,
        paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
        requesterId: owner.id,
        payerEmail: alphaContact.email,
        description: `alpha raw contracts payment`,
        createdAt: new Date(`2026-05-02T08:00:00.000Z`),
        updatedAt: new Date(`2026-05-02T08:00:00.000Z`),
      },
    });
    alphaRequestId = alphaRequest.id;

    const bravoRequest = await prisma.paymentRequestModel.create({
      data: {
        amount: 40,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.PENDING,
        paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
        requesterId: owner.id,
        payerEmail: bravoContact.email,
        description: `bravo raw contracts payment`,
        createdAt: new Date(`2026-05-03T08:00:00.000Z`),
        updatedAt: new Date(`2026-05-03T08:00:00.000Z`),
      },
    });
    bravoRequestId = bravoRequest.id;

    await prisma.ledgerEntryModel.create({
      data: {
        ledgerId: `00000000-0000-4000-8000-000000000101`,
        consumerId: owner.id,
        paymentRequestId: alphaRequest.id,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.COMPLETED,
        amount: -25,
        metadata: { tag: `contracts-alpha` },
        createdAt: new Date(`2026-05-02T08:00:00.000Z`),
        updatedAt: new Date(`2026-05-02T08:00:00.000Z`),
      },
    });

    const bravoEntry = await prisma.ledgerEntryModel.create({
      data: {
        ledgerId: `00000000-0000-4000-8000-000000000102`,
        consumerId: owner.id,
        paymentRequestId: bravoRequest.id,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.PENDING,
        amount: -40,
        metadata: { tag: `contracts-bravo` },
        createdAt: new Date(`2026-05-03T08:00:00.000Z`),
        updatedAt: new Date(`2026-05-03T08:00:00.000Z`),
      },
    });

    await prisma.ledgerEntryOutcomeModel.create({
      data: {
        ledgerEntryId: bravoEntry.id,
        status: $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
        source: `contracts-db-smoke`,
        externalId: `contracts-db-smoke-bravo`,
        createdAt: new Date(`2026-05-03T08:01:00.000Z`),
      },
    });

    const bravoResource = await prisma.resourceModel.create({
      data: {
        access: $Enums.ResourceAccess.PRIVATE,
        originalName: `contracts-proof.pdf`,
        mimetype: `application/pdf`,
        size: 128,
        bucket: `local`,
        key: `contracts/proof.pdf`,
        downloadUrl: `legacy://contracts-proof`,
      },
    });

    await prisma.paymentRequestAttachmentModel.create({
      data: {
        paymentRequestId: bravoRequest.id,
        requesterId: owner.id,
        resourceId: bravoResource.id,
      },
    });
  });

  afterAll(async () => {
    await prismaContext.disconnect();
  });

  it(`returns DB-backed contract pages and totals from the raw read model`, async () => {
    const firstPage = await service.getContracts(ownerId, 1, 1, undefined, undefined, undefined, `yes`);
    const secondPage = await service.getContracts(ownerId, 2, 1, undefined, undefined, undefined, `yes`);

    expect(firstPage.total).toBe(2);
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.items[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: `Bravo Vendor`,
        email: `bravo-vendor@local.test`,
        lastRequestId: bravoRequestId,
        lastStatus: `waiting`,
        docs: 1,
        paymentsCount: 1,
        completedPaymentsCount: 0,
      }),
    );

    expect(secondPage.total).toBe(2);
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.items[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: `Alpha Vendor`,
        email: `alpha-vendor@local.test`,
        lastRequestId: alphaRequestId,
        lastStatus: `completed`,
        docs: 0,
        paymentsCount: 1,
        completedPaymentsCount: 1,
      }),
    );
  });
});
