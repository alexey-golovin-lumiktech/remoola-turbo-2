/** @jest-environment @remoola/test-db/environment */

import { randomUUID } from 'crypto';

import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';

import { $Enums, PrismaClient } from '@remoola/database-2';
import { hashPassword } from '@remoola/security-utils';

import { assertIsolatedTestDatabaseUrl } from './test-db-safety';
import { AdminV2PaymentReversalService } from '../src/admin-v2/payments/admin-v2-payment-reversal.service';
import { AppModule } from '../src/app.module';
import { envs } from '../src/envs';
import { AuthGuard } from '../src/guards/auth.guard';
import { BrevoMailService } from '../src/shared/brevo-mail.service';
import { PrismaService } from '../src/shared/prisma.service';
import { getApiAdminCsrfTokenCookieKey } from '../src/shared-common';

describe(`Admin payment reversal success paths (e2e, isolated DB)`, () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const adminEmail = `admin-reversal@local.test`;
  const adminPassword = `AdminReversal1!@#`;
  const adminOrigin = `http://127.0.0.1:3010`;
  const consumerMobileOrigin = `http://127.0.0.1:3002`;
  let refundPaymentRequestId = ``;
  let chargebackPaymentRequestId = ``;
  let initialConsumerMobileOrigin: string;
  let initialBrevoApiKey: string;
  let initialBrevoDefaultFromEmail: string;
  let sendMailMock: ReturnType<typeof jest.spyOn>;

  function parseCookieValue(cookies: string[] | undefined, key: string): string | null {
    if (!Array.isArray(cookies)) return null;
    const row = cookies.find((line) => line.startsWith(`${key}=`));
    if (!row) return null;
    const [raw] = row.split(`;`);
    return raw.slice(`${key}=`.length);
  }

  function asCookieArray(header: string | string[] | undefined): string[] | undefined {
    if (Array.isArray(header)) return header;
    if (typeof header === `string`) return [header];
    return undefined;
  }

  async function seedCompletedPaymentRequest(
    amount: number,
    stripeId: string | null,
    newerScopeLessEntries = 0,
  ): Promise<string> {
    const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const payer = await prisma.consumerModel.create({
      data: {
        email: `payer-${suffix}@local.test`,
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.INDIVIDUAL,
      },
    });
    const requester = await prisma.consumerModel.create({
      data: {
        email: `requester-${suffix}@local.test`,
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.INDIVIDUAL,
      },
    });
    const paymentRequest = await prisma.paymentRequestModel.create({
      data: {
        payerId: payer.id,
        requesterId: requester.id,
        requesterEmail: requester.email,
        currencyCode: $Enums.CurrencyCode.USD,
        amount,
        status: $Enums.TransactionStatus.COMPLETED,
        createdBy: payer.id,
        updatedBy: payer.id,
      },
    });
    const ledgerId = randomUUID();
    await prisma.ledgerEntryModel.create({
      data: {
        ledgerId,
        consumerId: payer.id,
        paymentRequestId: paymentRequest.id,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.COMPLETED,
        amount: -amount,
        stripeId: stripeId ?? undefined,
        createdBy: payer.id,
        updatedBy: payer.id,
        metadata: { consumerAppScope: `consumer-css-grid` },
      },
    });
    await prisma.ledgerEntryModel.create({
      data: {
        ledgerId,
        consumerId: requester.id,
        paymentRequestId: paymentRequest.id,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.COMPLETED,
        amount: amount,
        createdBy: payer.id,
        updatedBy: payer.id,
        metadata: { consumerAppScope: `consumer-css-grid` },
      },
    });
    for (let index = 0; index < newerScopeLessEntries; index += 1) {
      await prisma.ledgerEntryModel.create({
        data: {
          ledgerId: randomUUID(),
          consumerId: payer.id,
          paymentRequestId: paymentRequest.id,
          type: $Enums.LedgerEntryType.PLATFORM_FEE,
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.PENDING,
          amount: -0.01,
          createdBy: payer.id,
          updatedBy: payer.id,
          metadata: {},
        },
      });
    }
    return paymentRequest.id;
  }

  beforeAll(async () => {
    assertIsolatedTestDatabaseUrl();
    initialConsumerMobileOrigin = envs.CONSUMER_CSS_GRID_APP_ORIGIN;
    initialBrevoApiKey = envs.BREVO_API_KEY;
    initialBrevoDefaultFromEmail = envs.BREVO_DEFAULT_FROM_EMAIL;
    envs.CONSUMER_CSS_GRID_APP_ORIGIN = consumerMobileOrigin;
    envs.BREVO_API_KEY = `test-api-key`;
    envs.BREVO_DEFAULT_FROM_EMAIL = `noreply@local.test`;
    prisma = new PrismaClient();
    await prisma.$connect();

    const { hash, salt } = await hashPassword(adminPassword);
    await prisma.adminModel.create({
      data: {
        email: adminEmail,
        password: hash,
        salt,
        type: $Enums.AdminType.ADMIN,
      },
    });

    refundPaymentRequestId = await seedCompletedPaymentRequest(20, `pi_refund_e2e`, 7);
    chargebackPaymentRequestId = await seedCompletedPaymentRequest(20, null, 7);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const adminPaymentRequestsService = moduleFixture.get(AdminV2PaymentReversalService) as unknown as {
      stripe: { refunds: { create: (...args: unknown[]) => Promise<{ id: string; status: string }> } };
    };
    const brevoMailService = moduleFixture.get(BrevoMailService) as unknown as {
      sendMail: jest.Mock;
    };
    const refundCreateMock = jest.fn(async () => ({ id: `re_e2e_success`, status: `succeeded` }));
    adminPaymentRequestsService.stripe.refunds.create = refundCreateMock;
    sendMailMock = jest.spyOn(brevoMailService, `sendMail`).mockImplementation(async () => {});

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(`api`);
    app.use(express.json({ limit: `10mb` }));
    app.use(cookieParser(`test-secret`));
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

  beforeEach(() => {
    sendMailMock.mockClear();
  });

  afterAll(async () => {
    envs.CONSUMER_CSS_GRID_APP_ORIGIN = initialConsumerMobileOrigin;
    envs.BREVO_API_KEY = initialBrevoApiKey;
    envs.BREVO_DEFAULT_FROM_EMAIL = initialBrevoDefaultFromEmail;
    await prisma.$disconnect();
    await app.close();
  });

  it(`refund creates reversal pair, records audit, and remains idempotent on replay`, async () => {
    const agent = request.agent(app.getHttpServer());
    const loginRes = await agent
      .post(`/api/admin-v2/auth/login`)
      .set(`origin`, adminOrigin)
      .send({ email: adminEmail, password: adminPassword })
      .expect(201);
    const csrf = parseCookieValue(asCookieArray(loginRes.headers[`set-cookie`]), getApiAdminCsrfTokenCookieKey());
    expect(csrf).toBeTruthy();

    const first = await agent
      .post(`/api/admin-v2/payments/${refundPaymentRequestId}/refund`)
      .set(`origin`, adminOrigin)
      .set(`x-csrf-token`, csrf ?? ``)
      .send({ amount: 7, reason: `e2e-refund`, passwordConfirmation: adminPassword })
      .expect(201);
    expect(first.body?.ledgerId).toBeTruthy();
    expect(first.body?.kind).toBe(`REFUND`);

    const second = await agent
      .post(`/api/admin-v2/payments/${refundPaymentRequestId}/refund`)
      .set(`origin`, adminOrigin)
      .set(`x-csrf-token`, csrf ?? ``)
      .send({ amount: 7, reason: `e2e-refund`, passwordConfirmation: adminPassword })
      .expect(201);
    expect(second.body?.ledgerId).toBe(first.body?.ledgerId);

    const reversalRows = await prisma.ledgerEntryModel.findMany({
      where: {
        paymentRequestId: refundPaymentRequestId,
        type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
      },
      orderBy: { amount: `asc` },
    });
    expect(reversalRows).toHaveLength(2);
    expect(Number(reversalRows[0].amount)).toBe(-7);
    expect(Number(reversalRows[1].amount)).toBe(7);
    expect(reversalRows[0].ledgerId).toBe(reversalRows[1].ledgerId);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining(`${consumerMobileOrigin}/payments/${refundPaymentRequestId}`),
      }),
    );

    const auditCount = await prisma.adminActionAuditLogModel.count({
      where: { action: `payment_refund`, resourceId: refundPaymentRequestId },
    });
    expect(auditCount).toBeGreaterThanOrEqual(1);
  });

  it(`chargeback creates reversal pair and records admin audit`, async () => {
    const agent = request.agent(app.getHttpServer());
    const loginRes = await agent
      .post(`/api/admin-v2/auth/login`)
      .set(`origin`, adminOrigin)
      .send({ email: adminEmail, password: adminPassword })
      .expect(201);
    const csrf = parseCookieValue(asCookieArray(loginRes.headers[`set-cookie`]), getApiAdminCsrfTokenCookieKey());
    expect(csrf).toBeTruthy();

    const response = await agent
      .post(`/api/admin-v2/payments/${chargebackPaymentRequestId}/chargeback`)
      .set(`origin`, adminOrigin)
      .set(`x-csrf-token`, csrf ?? ``)
      .send({ amount: 5, reason: `e2e-chargeback`, passwordConfirmation: adminPassword })
      .expect(201);

    expect(response.body?.ledgerId).toBeTruthy();
    expect(response.body?.kind).toBe(`CHARGEBACK`);

    const reversalRows = await prisma.ledgerEntryModel.findMany({
      where: {
        paymentRequestId: chargebackPaymentRequestId,
        type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
      },
      orderBy: { amount: `asc` },
    });
    expect(reversalRows).toHaveLength(2);
    expect(Number(reversalRows[0].amount)).toBe(-5);
    expect(Number(reversalRows[1].amount)).toBe(5);
    expect(reversalRows[0].ledgerId).toBe(reversalRows[1].ledgerId);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining(`${consumerMobileOrigin}/payments/${chargebackPaymentRequestId}`),
      }),
    );

    const auditCount = await prisma.adminActionAuditLogModel.count({
      where: { action: `payment_chargeback`, resourceId: chargebackPaymentRequestId },
    });
    expect(auditCount).toBeGreaterThanOrEqual(1);
  });
});
