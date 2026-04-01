/**
 * E2E idempotency/concurrency tests for consumer withdraw and transfer endpoints.
 * Uses an isolated temporary DB per run via @remoola/test-db/environment.
 */
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

import { $Enums, PrismaClient } from '@remoola/database-2';
import { hashPassword } from '@remoola/security-utils';

import { assertIsolatedTestDatabaseUrl } from './test-db-safety';
import { AppModule } from '../src/app.module';
import { envs } from '../src/envs';
import { AuthGuard } from '../src/guards/auth.guard';
import { PrismaService } from '../src/shared/prisma.service';

describe(`Consumer payments idempotency and concurrency (e2e, isolated DB)`, () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const senderEmail = `payments-sender@local.test`;
  const recipientEmail = `payments-recipient@local.test`;
  const senderPassword = `SenderPassword1!`;
  let senderId = ``;
  let recipientId = ``;

  beforeAll(async () => {
    assertIsolatedTestDatabaseUrl();
    prisma = new PrismaClient();
    await prisma.$connect();

    const senderPasswordHash = await hashPassword(senderPassword);
    const sender = await prisma.consumerModel.create({
      data: {
        email: senderEmail,
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.INDIVIDUAL,
        password: senderPasswordHash.hash,
        salt: senderPasswordHash.salt,
      },
    });
    const recipient = await prisma.consumerModel.create({
      data: {
        email: recipientEmail,
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.INDIVIDUAL,
      },
    });
    senderId = sender.id;
    recipientId = recipient.id;

    await prisma.ledgerEntryModel.create({
      data: {
        ledgerId: randomUUID(),
        consumerId: senderId,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.COMPLETED,
        amount: 200,
        createdBy: `e2e`,
        updatedBy: `e2e`,
      },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

  it(`enforces idempotency-key header for withdraw and transfer`, async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post(`/api/consumer/auth/login`).send({ email: senderEmail, password: senderPassword }).expect(201);

    await agent
      .post(`/api/consumer/payments/withdraw`)
      .send({ amount: 10, method: `BANK_ACCOUNT`, currencyCode: `USD` })
      .expect(400);

    await agent
      .post(`/api/consumer/payments/transfer`)
      .send({ amount: 10, recipient: recipientEmail, currencyCode: `USD` })
      .expect(400);
  });

  it(`withdraw replay with same key returns existing entry without duplicates`, async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post(`/api/consumer/auth/login`).send({ email: senderEmail, password: senderPassword }).expect(201);

    const idempotencyKey = `withdraw-${Date.now()}`;
    const first = await agent
      .post(`/api/consumer/payments/withdraw`)
      .set(`idempotency-key`, idempotencyKey)
      .send({ amount: 11, method: `BANK_ACCOUNT`, currencyCode: `USD` })
      .expect(201);

    const replay = await agent
      .post(`/api/consumer/payments/withdraw`)
      .set(`idempotency-key`, idempotencyKey)
      .send({ amount: 11, method: `BANK_ACCOUNT`, currencyCode: `USD` })
      .expect(201);

    expect(replay.body?.id).toBe(first.body?.id);

    const rows = await prisma.ledgerEntryModel.count({
      where: {
        consumerId: senderId,
        idempotencyKey: `withdraw:${idempotencyKey}`,
        type: $Enums.LedgerEntryType.USER_PAYOUT,
      },
    });
    expect(rows).toBe(1);
  });

  it(`parallel transfer requests with same key converge to one logical transfer`, async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post(`/api/consumer/auth/login`).send({ email: senderEmail, password: senderPassword }).expect(201);

    const idempotencyKey = `transfer-${Date.now()}`;
    const [a, b] = await Promise.all([
      agent
        .post(`/api/consumer/payments/transfer`)
        .set(`idempotency-key`, idempotencyKey)
        .send({ amount: 13, recipient: recipientEmail, currencyCode: `USD` }),
      agent
        .post(`/api/consumer/payments/transfer`)
        .set(`idempotency-key`, idempotencyKey)
        .send({ amount: 13, recipient: recipientEmail, currencyCode: `USD` }),
    ]);
    expect(a.status).toBeLessThan(400);
    expect(b.status).toBeLessThan(400);
    expect(a.body?.ledgerId).toBeTruthy();
    expect(b.body?.ledgerId).toBe(a.body?.ledgerId);

    const senderEntry = await prisma.ledgerEntryModel.findFirst({
      where: {
        consumerId: senderId,
        idempotencyKey: `transfer:${idempotencyKey}:sender`,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
      },
      select: { ledgerId: true, amount: true },
    });
    const recipientEntry = await prisma.ledgerEntryModel.findFirst({
      where: {
        consumerId: recipientId,
        idempotencyKey: `transfer:${idempotencyKey}:recipient`,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
      },
      select: { ledgerId: true, amount: true },
    });

    expect(senderEntry).toBeTruthy();
    expect(recipientEntry).toBeTruthy();
    expect(senderEntry?.ledgerId).toBe(recipientEntry?.ledgerId);
    expect(Number(senderEntry?.amount ?? 0)).toBe(-13);
    expect(Number(recipientEntry?.amount ?? 0)).toBe(13);
  });

  it(`concurrent withdraw and transfer requests enforce the daily limit atomically`, async () => {
    await prisma.consumerModel.update({
      where: { id: senderId },
      data: {
        legalVerified: true,
        verificationStatus: $Enums.VerificationStatus.APPROVED,
      },
    });
    await prisma.ledgerEntryModel.createMany({
      data: [
        {
          ledgerId: randomUUID(),
          consumerId: senderId,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.COMPLETED,
          amount: 100000,
          createdBy: `e2e`,
          updatedBy: `e2e`,
        },
        {
          ledgerId: randomUUID(),
          consumerId: senderId,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.COMPLETED,
          amount: -40000,
          createdBy: `e2e`,
          updatedBy: `e2e`,
        },
      ],
    });

    const agent = request.agent(app.getHttpServer());
    await agent.post(`/api/consumer/auth/login`).send({ email: senderEmail, password: senderPassword }).expect(201);

    const withdrawKey = `withdraw-daily-${Date.now()}`;
    const transferKey = `transfer-daily-${Date.now()}`;

    const [withdrawRes, transferRes] = await Promise.all([
      agent
        .post(`/api/consumer/payments/withdraw`)
        .set(`idempotency-key`, withdrawKey)
        .send({ amount: 6000, method: `BANK_ACCOUNT`, currencyCode: `USD` }),
      agent
        .post(`/api/consumer/payments/transfer`)
        .set(`idempotency-key`, transferKey)
        .send({ amount: 6000, recipient: recipientEmail, currencyCode: `USD` }),
    ]);

    const responses = [withdrawRes, transferRes];
    const successes = responses.filter((response) => response.status < 400);
    const failures = responses.filter((response) => response.status >= 400);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.status).toBe(400);
    expect(failures[0]?.body?.message).toBe(`AMOUNT_EXCEEDS_DAILY_LIMIT`);

    const senderSideRows = await prisma.ledgerEntryModel.count({
      where: {
        consumerId: senderId,
        OR: [
          {
            idempotencyKey: `withdraw:${withdrawKey}`,
            type: $Enums.LedgerEntryType.USER_PAYOUT,
          },
          {
            idempotencyKey: `transfer:${transferKey}:sender`,
            type: $Enums.LedgerEntryType.USER_PAYMENT,
          },
        ],
      },
    });

    expect(senderSideRows).toBe(1);
  });
});
