/** @jest-environment @remoola/test-db/environment */

import { randomUUID } from 'crypto';

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';

import { CONSUMER_APP_SCOPE_HEADER, CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';
import { $Enums, PrismaClient } from '@remoola/database-2';
import { hashPassword } from '@remoola/security-utils';

import { assertIsolatedTestDatabaseUrl } from './test-db-safety';
import { AppModule } from '../src/app.module';
import { envs } from '../src/envs';
import { AuthGuard } from '../src/guards/auth.guard';
import { PrismaService } from '../src/shared/prisma.service';
import { getApiConsumerCsrfTokenCookieKeysForRead } from '../src/shared-common';

describe(`Consumer WAITING status compatibility (e2e, isolated DB)`, () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const ownerEmail = `waiting-owner@local.test`;
  const counterpartyEmail = `waiting-counterparty@local.test`;
  const password = `WaitingPassword1!`;
  const consumerOrigin = `http://127.0.0.1:3003`;
  const appScope = CURRENT_CONSUMER_APP_SCOPE;
  let contactId = ``;
  let paymentRequestId = ``;
  let invoiceResourceId = ``;

  function parseCookieValue(cookies: string[] | undefined, key: string): string | null {
    if (!Array.isArray(cookies)) return null;
    const row = cookies.find((line) => line.startsWith(`${key}=`));
    if (!row) return null;
    const [raw] = row.split(`;`);
    return raw.slice(`${key}=`.length);
  }

  function parseCookieValueForKeys(cookies: string[] | undefined, keys: readonly string[]): string | null {
    for (const key of keys) {
      const value = parseCookieValue(cookies, key);
      if (value) return value;
    }
    return null;
  }

  function asCookieArray(header: string | string[] | undefined): string[] | undefined {
    if (Array.isArray(header)) return header;
    if (typeof header === `string`) return [header];
    return undefined;
  }

  function withConsumerAppScope<T extends request.Test>(req: T): T {
    return req.set(`origin`, consumerOrigin).set(CONSUMER_APP_SCOPE_HEADER, appScope);
  }

  beforeAll(async () => {
    assertIsolatedTestDatabaseUrl();
    prisma = new PrismaClient();
    await prisma.$connect();

    const passwordHash = await hashPassword(password);
    const owner = await prisma.consumerModel.create({
      data: {
        email: ownerEmail,
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.INDIVIDUAL,
        password: passwordHash.hash,
        salt: passwordHash.salt,
      },
    });
    const counterparty = await prisma.consumerModel.create({
      data: {
        email: counterpartyEmail,
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.INDIVIDUAL,
      },
    });
    const contact = await prisma.contactModel.create({
      data: {
        consumerId: owner.id,
        email: counterpartyEmail,
        name: `Waiting Counterparty`,
        address: { country: `US` },
      },
    });
    contactId = contact.id;

    const paymentRequest = await prisma.paymentRequestModel.create({
      data: {
        amount: 17,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
        paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
        payerId: counterparty.id,
        requesterId: owner.id,
        description: `WAITING compat e2e payment`,
      },
    });
    paymentRequestId = paymentRequest.id;

    await prisma.ledgerEntryModel.create({
      data: {
        ledgerId: randomUUID(),
        consumerId: owner.id,
        paymentRequestId: paymentRequest.id,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
        amount: -17,
        metadata: { rail: $Enums.PaymentRail.BANK_TRANSFER },
        createdBy: `e2e`,
        updatedBy: `e2e`,
      },
    });

    const invoiceResource = await prisma.resourceModel.create({
      data: {
        access: $Enums.ResourceAccess.PRIVATE,
        originalName: `INV-WAITING-12345678.pdf`,
        mimetype: `application/pdf`,
        size: 32,
        bucket: `local`,
        key: `e2e/invoice-waiting.pdf`,
        downloadUrl: `legacy://unused`,
        resourceTags: {
          create: {
            tag: {
              connectOrCreate: {
                where: { name: `INVOICE-WAITING` },
                create: { name: `INVOICE-WAITING` },
              },
            },
          },
        },
      },
    });
    invoiceResourceId = invoiceResource.id;

    await prisma.consumerResourceModel.create({
      data: {
        consumerId: owner.id,
        resourceId: invoiceResource.id,
      },
    });

    await prisma.paymentRequestAttachmentModel.create({
      data: {
        paymentRequestId: paymentRequest.id,
        requesterId: owner.id,
        resourceId: invoiceResource.id,
      },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(`api`);
    app.use(express.json({ limit: `10mb` }));
    app.use(cookieParser(envs.SECURE_SESSION_SECRET));
    app.useGlobalPipes(
      new ValidationPipe({
        skipMissingProperties: true,
        skipNullProperties: true,
        skipUndefinedProperties: true,
        stopAtFirstError: true,
        transform: true,
        transformOptions: {
          excludeExtraneousValues: true,
          exposeUnsetFields: false,
          enableImplicitConversion: true,
          exposeDefaultValues: false,
        },
      }),
    );
    const reflector = moduleFixture.get(Reflector);
    const jwtService = moduleFixture.get(JwtService);
    const prismaService = moduleFixture.get(PrismaService);
    app.useGlobalGuards(new AuthGuard(reflector, jwtService, prismaService));
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app?.close();
  });

  it(`keeps raw waiting-recipient-approval out of consumer endpoint payloads`, async () => {
    const agent = request.agent(app.getHttpServer());
    const loginRes = await withConsumerAppScope(agent.post(`/api/consumer/auth/login?appScope=${appScope}`))
      .send({ email: ownerEmail, password })
      .expect(200);
    const csrf = parseCookieValueForKeys(
      asCookieArray(loginRes.headers[`set-cookie`]),
      getApiConsumerCsrfTokenCookieKeysForRead(appScope),
    );
    expect(csrf).toBeTruthy();

    const listRes = await withConsumerAppScope(
      agent.get(`/api/consumer/payments`).query({ status: $Enums.TransactionStatus.WAITING }),
    ).expect(200);
    expect(listRes.body.items[0]?.status).toBe($Enums.TransactionStatus.WAITING);
    expect(listRes.body.items[0]?.latestTransaction?.status).toBe($Enums.TransactionStatus.WAITING);
    expect(JSON.stringify(listRes.body)).not.toContain($Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL);

    const detailRes = await withConsumerAppScope(agent.get(`/api/consumer/payments/${paymentRequestId}`)).expect(200);
    expect(detailRes.body.status).toBe($Enums.TransactionStatus.WAITING);
    expect(detailRes.body.ledgerEntries[0]?.status).toBe($Enums.TransactionStatus.WAITING);
    expect(JSON.stringify(detailRes.body)).not.toContain($Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL);

    const historyRes = await withConsumerAppScope(
      agent.get(`/api/consumer/payments/history`).query({ status: $Enums.TransactionStatus.WAITING }),
    ).expect(200);
    expect(historyRes.body.items[0]?.status).toBe($Enums.TransactionStatus.WAITING);
    expect(JSON.stringify(historyRes.body)).not.toContain($Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL);

    const contactRes = await withConsumerAppScope(agent.get(`/api/consumer/contacts/${contactId}/details`)).expect(200);
    expect(contactRes.body.paymentRequests[0]?.status).toBe($Enums.TransactionStatus.WAITING);
    expect(JSON.stringify(contactRes.body)).not.toContain($Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL);

    const contractsRes = await withConsumerAppScope(agent.get(`/api/consumer/contracts`)).expect(200);
    expect(contractsRes.body.items[0]?.lastStatus).toBe(`waiting`);
    expect(JSON.stringify(contractsRes.body)).not.toContain($Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL);

    const invoiceRes = await withConsumerAppScope(
      agent.post(`/api/consumer/payments/${paymentRequestId}/generate-invoice`),
    )
      .set(`x-csrf-token`, csrf ?? ``)
      .expect(201);
    expect(invoiceRes.body.invoiceNumber).toBe(`INV-WAITING-12345678`);
    expect(invoiceRes.body.resourceId).toBe(invoiceResourceId);
    expect(invoiceRes.body.downloadUrl).toMatch(new RegExp(`/api/consumer/documents/${invoiceResourceId}/download$`));
    expect(JSON.stringify(invoiceRes.body)).not.toContain($Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL);
  });
});
