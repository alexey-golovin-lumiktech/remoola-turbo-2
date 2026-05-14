/** @jest-environment @remoola/test-db/environment */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';

import { $Enums } from '@remoola/database-2';

import { ConsumerDocumentListRepository } from './consumer-document-list.repository';
import { createPrismaTestContext } from '../../../../test/helpers/prisma-test-context';

describe(`ConsumerDocumentListRepository DB smoke`, () => {
  const prismaContext = createPrismaTestContext();
  const { prisma } = prismaContext;
  const query = new ConsumerDocumentListRepository(prisma as any);

  let ownerId = ``;
  let contactAlphaId = ``;
  let ownedOnlyResourceId = ``;
  let sharedResourceId = ``;
  let alphaResourceId = ``;
  let betaResourceId = ``;
  let draftPaymentId = ``;
  let completedPaymentId = ``;

  beforeAll(async () => {
    await prismaContext.connect();

    const owner = await prisma.consumerModel.create({
      data: {
        email: `document-list-owner@local.test`,
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.INDIVIDUAL,
      },
    });
    ownerId = owner.id;

    const alphaContact = await prisma.contactModel.create({
      data: {
        consumerId: owner.id,
        email: `document-list-alpha@local.test`,
        name: `Document Alpha`,
        address: { country: `US` },
      },
    });
    contactAlphaId = alphaContact.id;

    const betaContact = await prisma.contactModel.create({
      data: {
        consumerId: owner.id,
        email: `document-list-beta@local.test`,
        name: `Document Beta`,
        address: { country: `US` },
      },
    });

    const ownedOnlyResource = await prisma.resourceModel.create({
      data: {
        access: $Enums.ResourceAccess.PRIVATE,
        originalName: `owned-general-note.txt`,
        mimetype: `text/plain`,
        size: 32,
        bucket: `local`,
        key: `documents/owned-general-note.txt`,
        downloadUrl: `legacy://owned-general-note`,
        createdAt: new Date(`2026-05-10T08:00:00.000Z`),
      },
    });
    ownedOnlyResourceId = ownedOnlyResource.id;
    await prisma.consumerResourceModel.create({
      data: {
        consumerId: owner.id,
        resourceId: ownedOnlyResource.id,
        createdAt: new Date(`2026-05-10T08:00:00.000Z`),
      },
    });

    const sharedResource = await prisma.resourceModel.create({
      data: {
        access: $Enums.ResourceAccess.PRIVATE,
        originalName: `invoice-shared.pdf`,
        mimetype: `application/pdf`,
        size: 128,
        bucket: `local`,
        key: `documents/invoice-shared.pdf`,
        downloadUrl: `legacy://invoice-shared`,
        createdAt: new Date(`2026-05-10T09:00:00.000Z`),
      },
    });
    sharedResourceId = sharedResource.id;
    await prisma.consumerResourceModel.create({
      data: {
        consumerId: owner.id,
        resourceId: sharedResource.id,
        createdAt: new Date(`2026-05-10T09:00:00.000Z`),
      },
    });

    const alphaResource = await prisma.resourceModel.create({
      data: {
        access: $Enums.ResourceAccess.PRIVATE,
        originalName: `alpha-payment-proof.pdf`,
        mimetype: `application/pdf`,
        size: 256,
        bucket: `local`,
        key: `documents/alpha-payment-proof.pdf`,
        downloadUrl: `legacy://alpha-payment-proof`,
        createdAt: new Date(`2026-05-10T10:00:00.000Z`),
      },
    });
    alphaResourceId = alphaResource.id;

    const betaResource = await prisma.resourceModel.create({
      data: {
        access: $Enums.ResourceAccess.PRIVATE,
        originalName: `beta-payment-proof.pdf`,
        mimetype: `application/pdf`,
        size: 512,
        bucket: `local`,
        key: `documents/beta-payment-proof.pdf`,
        downloadUrl: `legacy://beta-payment-proof`,
        createdAt: new Date(`2026-05-10T11:00:00.000Z`),
      },
    });
    betaResourceId = betaResource.id;

    const draftPayment = await prisma.paymentRequestModel.create({
      data: {
        amount: 10,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.DRAFT,
        paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
        requesterId: owner.id,
        payerEmail: alphaContact.email,
        description: `document draft payment`,
        createdAt: new Date(`2026-05-10T12:00:00.000Z`),
        updatedAt: new Date(`2026-05-10T12:00:00.000Z`),
      },
    });
    draftPaymentId = draftPayment.id;

    const completedPayment = await prisma.paymentRequestModel.create({
      data: {
        amount: 20,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.COMPLETED,
        paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
        requesterId: owner.id,
        payerEmail: alphaContact.email,
        description: `document completed payment`,
        createdAt: new Date(`2026-05-10T13:00:00.000Z`),
        updatedAt: new Date(`2026-05-10T13:00:00.000Z`),
      },
    });
    completedPaymentId = completedPayment.id;

    const betaPayment = await prisma.paymentRequestModel.create({
      data: {
        amount: 30,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.COMPLETED,
        paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
        requesterId: owner.id,
        payerEmail: betaContact.email,
        description: `document beta payment`,
        createdAt: new Date(`2026-05-10T14:00:00.000Z`),
        updatedAt: new Date(`2026-05-10T14:00:00.000Z`),
      },
    });

    await prisma.paymentRequestAttachmentModel.createMany({
      data: [
        {
          paymentRequestId: draftPayment.id,
          requesterId: owner.id,
          resourceId: sharedResource.id,
          createdAt: new Date(`2026-05-10T12:01:00.000Z`),
        },
        {
          paymentRequestId: completedPayment.id,
          requesterId: owner.id,
          resourceId: sharedResource.id,
          createdAt: new Date(`2026-05-10T13:01:00.000Z`),
        },
        {
          paymentRequestId: completedPayment.id,
          requesterId: owner.id,
          resourceId: alphaResource.id,
          createdAt: new Date(`2026-05-10T13:02:00.000Z`),
        },
        {
          paymentRequestId: betaPayment.id,
          requesterId: owner.id,
          resourceId: betaResource.id,
          createdAt: new Date(`2026-05-10T14:01:00.000Z`),
        },
      ],
    });

    const financeTag = await prisma.documentTagModel.create({ data: { name: `finance` } });
    await prisma.resourceTagModel.create({
      data: {
        resourceId: sharedResource.id,
        tagId: financeTag.id,
      },
    });
  });

  afterAll(async () => {
    await prismaContext.disconnect();
  });

  it(`returns empty pages with the DB-backed total count preserved`, async () => {
    const page = await query.list({
      consumerId: ownerId,
      page: 3,
      pageSize: 2,
      backendBaseUrl: `http://localhost:3334`,
    });

    expect(page).toEqual({
      items: [],
      total: 4,
      page: 3,
      pageSize: 2,
    });
  });

  it(`scopes contactId listings to one counterparty relationship`, async () => {
    const result = await query.list({
      consumerId: ownerId,
      contactId: contactAlphaId,
      page: 1,
      pageSize: 10,
      backendBaseUrl: `http://localhost:3334`,
    });

    expect(result.total).toBe(2);
    expect(result.items.map((item) => item.id).sort()).toEqual([alphaResourceId, sharedResourceId].sort());
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: sharedResourceId,
          kind: `PAYMENT`,
          attachedDraftPaymentRequestIds: [draftPaymentId],
          attachedNonDraftPaymentRequestIds: [completedPaymentId],
        }),
        expect.objectContaining({
          id: alphaResourceId,
          kind: `PAYMENT`,
          attachedDraftPaymentRequestIds: [],
          attachedNonDraftPaymentRequestIds: [completedPaymentId],
        }),
      ]),
    );
    expect(result.items.map((item) => item.id)).not.toContain(betaResourceId);
    expect(result.items.map((item) => item.id)).not.toContain(ownedOnlyResourceId);
  });

  it(`merges owned and attached rows with attachment arrays and tags`, async () => {
    const result = await query.list({
      consumerId: ownerId,
      page: 1,
      pageSize: 10,
      backendBaseUrl: `http://localhost:3334`,
    });

    const shared = result.items.find((item) => item.id === sharedResourceId);

    expect(shared).toEqual(
      expect.objectContaining({
        id: sharedResourceId,
        name: `invoice-shared.pdf`,
        kind: `PAYMENT`,
        tags: [`finance`],
        isAttachedToDraftPaymentRequest: true,
        attachedDraftPaymentRequestIds: [draftPaymentId],
        isAttachedToNonDraftPaymentRequest: true,
        attachedNonDraftPaymentRequestIds: [completedPaymentId],
      }),
    );
  });
});
