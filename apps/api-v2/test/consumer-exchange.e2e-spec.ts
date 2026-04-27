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

import { CONSUMER_APP_SCOPE_HEADER } from '@remoola/api-types';
import { $Enums, PrismaClient } from '@remoola/database-2';
import { hashPassword } from '@remoola/security-utils';

import { assertIsolatedTestDatabaseUrl } from './test-db-safety';
import { AppModule } from '../src/app.module';
import { ConsumerExchangeService } from '../src/consumer/modules/exchange/consumer-exchange.service';
import { envs } from '../src/envs';
import { AuthGuard } from '../src/guards/auth.guard';
import { PrismaService } from '../src/shared/prisma.service';
import { getApiConsumerCsrfTokenCookieKeysForRead } from '../src/shared-common';

describe(`Consumer exchange convert and scheduled execution (e2e, isolated DB)`, () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let exchangeService: ConsumerExchangeService;
  const consumerOrigin = `http://127.0.0.1:3003`;
  const appScope = `consumer-css-grid` as const;

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

  async function createConsumerWithUsdBalance(params: { email: string; password: string; balance: number }) {
    const { hash, salt } = await hashPassword(params.password);
    const consumer = await prisma.consumerModel.create({
      data: {
        email: params.email,
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.INDIVIDUAL,
        password: hash,
        salt,
      },
    });

    await prisma.ledgerEntryModel.create({
      data: {
        ledgerId: randomUUID(),
        consumerId: consumer.id,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.COMPLETED,
        amount: params.balance,
        createdBy: `e2e`,
        updatedBy: `e2e`,
      },
    });

    return consumer;
  }

  beforeAll(async () => {
    assertIsolatedTestDatabaseUrl();
    prisma = new PrismaClient();
    await prisma.$connect();

    await prisma.exchangeRateModel.create({
      data: {
        fromCurrency: $Enums.CurrencyCode.USD,
        toCurrency: $Enums.CurrencyCode.EUR,
        rate: 0.92,
        status: $Enums.ExchangeRateStatus.APPROVED,
        effectiveAt: new Date(Date.now() - 60_000),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        fetchedAt: new Date(),
        provider: `e2e`,
        providerRateId: `usd-eur-live`,
        confidence: 100,
      },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    exchangeService = moduleFixture.get(ConsumerExchangeService);
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
    await app.close();
  });

  it(`POST /consumer/exchange/convert writes matched source and target ledger entries in the database`, async () => {
    const consumer = await createConsumerWithUsdBalance({
      email: `exchange-convert-${Date.now()}@local.test`,
      password: `ExchangeConvert1!`,
      balance: 100,
    });

    const agent = request.agent(app.getHttpServer());
    const loginRes = await withConsumerAppScope(agent.post(`/api/consumer/auth/login?appScope=${appScope}`))
      .send({ email: consumer.email, password: `ExchangeConvert1!` })
      .expect(200);
    const csrf = parseCookieValueForKeys(
      asCookieArray(loginRes.headers[`set-cookie`]),
      getApiConsumerCsrfTokenCookieKeysForRead(appScope),
    );
    expect(csrf).toBeTruthy();

    const response = await withConsumerAppScope(agent.post(`/api/consumer/exchange/convert`))
      .set(`x-csrf-token`, csrf ?? ``)
      .send({
        from: $Enums.CurrencyCode.USD,
        to: $Enums.CurrencyCode.EUR,
        amount: 50,
      })
      .expect(201);

    expect(response.body?.ledgerId).toBeTruthy();
    expect(response.body?.rate).toBe(0.92);
    expect(response.body?.sourceAmount).toBe(50);
    expect(response.body?.targetAmount).toBe(46);

    const rows = await prisma.ledgerEntryModel.findMany({
      where: { ledgerId: response.body.ledgerId, consumerId: consumer.id },
      select: {
        currencyCode: true,
        amount: true,
        status: true,
        type: true,
      },
    });

    expect(rows).toHaveLength(2);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currencyCode: $Enums.CurrencyCode.EUR,
          status: $Enums.TransactionStatus.COMPLETED,
          type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
        }),
        expect.objectContaining({
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.COMPLETED,
          type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
        }),
      ]),
    );

    const amountsByCurrency = new Map(rows.map((row) => [row.currencyCode, Number(row.amount)]));
    expect(amountsByCurrency.get($Enums.CurrencyCode.USD)).toBe(-50);
    expect(amountsByCurrency.get($Enums.CurrencyCode.EUR)).toBe(46);
  });

  const scheduledConversionCase = [
    `processDueScheduledConversions executes a due conversion once`,
    `and persists scheduled idempotency keys`,
  ].join(` `);

  it(scheduledConversionCase, async () => {
    const consumer = await createConsumerWithUsdBalance({
      email: `exchange-scheduled-${Date.now()}@local.test`,
      password: `ExchangeScheduled1!`,
      balance: 100,
    });

    const scheduled = await prisma.scheduledFxConversionModel.create({
      data: {
        consumerId: consumer.id,
        fromCurrency: $Enums.CurrencyCode.USD,
        toCurrency: $Enums.CurrencyCode.EUR,
        amount: 20,
        status: $Enums.ScheduledFxConversionStatus.PENDING,
        executeAt: new Date(Date.now() - 60_000),
      },
    });

    await exchangeService.processDueScheduledConversions();
    await exchangeService.processDueScheduledConversions();

    const stored = await prisma.scheduledFxConversionModel.findUniqueOrThrow({
      where: { id: scheduled.id },
      select: {
        status: true,
        attempts: true,
        ledgerId: true,
        lastError: true,
      },
    });

    expect(stored.status).toBe($Enums.ScheduledFxConversionStatus.EXECUTED);
    expect(stored.attempts).toBe(1);
    expect(stored.ledgerId).toBeTruthy();
    expect(stored.lastError).toBeNull();

    const scheduledRows = await prisma.ledgerEntryModel.findMany({
      where: {
        consumerId: consumer.id,
        OR: [
          { idempotencyKey: `scheduled:${scheduled.id}:source` },
          { idempotencyKey: `scheduled:${scheduled.id}:target` },
        ],
      },
      orderBy: [{ idempotencyKey: `asc` }],
      select: {
        ledgerId: true,
        currencyCode: true,
        amount: true,
        idempotencyKey: true,
      },
    });

    expect(scheduledRows).toHaveLength(2);
    expect(new Set(scheduledRows.map((row) => row.ledgerId))).toEqual(new Set([stored.ledgerId]));

    const amountsByKey = new Map(scheduledRows.map((row) => [row.idempotencyKey, Number(row.amount)]));
    expect(amountsByKey.get(`scheduled:${scheduled.id}:source`)).toBe(-20);
    expect(amountsByKey.get(`scheduled:${scheduled.id}:target`)).toBe(18.4);
  });
});
