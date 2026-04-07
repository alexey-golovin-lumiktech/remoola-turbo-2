/**
 * E2E coverage for authenticated consumer document downloads.
 * Uses an isolated temporary DB per run via @remoola/test-db/environment.
 */
/** @jest-environment @remoola/test-db/environment */

import { mkdir, rm, writeFile } from 'fs/promises';
import { dirname, join } from 'path';

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
import { envs } from '../src/envs';
import { AuthGuard } from '../src/guards/auth.guard';
import { PrismaService } from '../src/shared/prisma.service';

describe(`Consumer document downloads (e2e, isolated DB)`, () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const consumerOrigin = `http://127.0.0.1:3003`;
  const appScope = `consumer-css-grid` as const;
  const ownerEmail = `documents-owner@local.test`;
  const otherEmail = `documents-other@local.test`;
  const password = `OwnerPassword1!`;

  function withConsumerAppScope<T extends request.Test>(req: T): T {
    return req.set(`origin`, consumerOrigin).set(CONSUMER_APP_SCOPE_HEADER, appScope);
  }
  let ownerId = ``;
  let otherId = ``;
  let resourceId = ``;
  let invoiceResourceId = ``;
  const fileKey = `e2e-documents/secure-file.txt`;
  const invoiceFileKey = `e2e-documents/private-invoice.pdf`;
  const fileContents = `private document contents`;
  const invoiceContents = `%PDF-1.4 private invoice`;
  const filePath = join(process.cwd(), `uploads`, fileKey);
  const invoicePath = join(process.cwd(), `uploads`, invoiceFileKey);

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
    const other = await prisma.consumerModel.create({
      data: {
        email: otherEmail,
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.INDIVIDUAL,
        password: passwordHash.hash,
        salt: passwordHash.salt,
      },
    });
    ownerId = owner.id;
    otherId = other.id;

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, fileContents, `utf8`);
    await writeFile(invoicePath, invoiceContents, `utf8`);

    const resource = await prisma.resourceModel.create({
      data: {
        access: $Enums.ResourceAccess.PRIVATE,
        originalName: `secure-file.txt`,
        mimetype: `text/plain`,
        size: Buffer.byteLength(fileContents),
        bucket: `local`,
        key: fileKey,
        downloadUrl: `legacy://unused`,
      },
    });
    resourceId = resource.id;

    const invoiceResource = await prisma.resourceModel.create({
      data: {
        access: $Enums.ResourceAccess.PRIVATE,
        originalName: `invoice.pdf`,
        mimetype: `application/pdf`,
        size: Buffer.byteLength(invoiceContents),
        bucket: `local`,
        key: invoiceFileKey,
        downloadUrl: `legacy://unused`,
        resourceTags: {
          create: {
            tag: {
              connectOrCreate: {
                where: { name: `INVOICE-PENDING` },
                create: { name: `INVOICE-PENDING` },
              },
            },
          },
        },
      },
    });
    invoiceResourceId = invoiceResource.id;

    await prisma.consumerResourceModel.create({
      data: {
        consumerId: ownerId,
        resourceId,
      },
    });
    await prisma.consumerResourceModel.create({
      data: {
        consumerId: ownerId,
        resourceId: invoiceResourceId,
      },
    });

    const paymentRequest = await prisma.paymentRequestModel.create({
      data: {
        amount: 17,
        currencyCode: $Enums.CurrencyCode.USD,
        status: $Enums.TransactionStatus.PENDING,
        payerId: otherId,
        requesterId: ownerId,
      },
    });
    await prisma.paymentRequestAttachmentModel.create({
      data: {
        paymentRequestId: paymentRequest.id,
        requesterId: ownerId,
        resourceId: invoiceResourceId,
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
    await rm(join(process.cwd(), `uploads`, `e2e-documents`), { recursive: true, force: true });
    await prisma.$disconnect();
    await app.close();
  });

  it(`rejects anonymous requests before reaching the private file`, async () => {
    await request(app.getHttpServer()).get(`/api/consumer/documents/${resourceId}/download`).expect(401);
  });

  it(`streams the document for the owning consumer`, async () => {
    const agent = request.agent(app.getHttpServer());
    await withConsumerAppScope(agent.post(`/api/consumer/auth/login?appScope=${appScope}`))
      .send({ email: ownerEmail, password })
      .expect(200);

    const response = await withConsumerAppScope(agent.get(`/api/consumer/documents/${resourceId}/download`)).expect(
      200,
    );

    expect(response.text).toBe(fileContents);
    expect(response.headers[`content-type`]).toContain(`text/plain`);
    expect(response.headers[`cache-control`]).toBe(`private, no-store`);
    expect(response.headers[`content-disposition`]).toContain(`inline;`);
  });

  it(`denies a different authenticated consumer`, async () => {
    const agent = request.agent(app.getHttpServer());
    await withConsumerAppScope(agent.post(`/api/consumer/auth/login?appScope=${appScope}`))
      .send({ email: otherEmail, password })
      .expect(200);

    await withConsumerAppScope(agent.get(`/api/consumer/documents/${resourceId}/download`)).expect(403);
    expect(otherId).not.toBe(ownerId);
  });

  it(`denies a payment counterparty from downloading another consumer's generated invoice`, async () => {
    const agent = request.agent(app.getHttpServer());
    await withConsumerAppScope(agent.post(`/api/consumer/auth/login?appScope=${appScope}`))
      .send({ email: otherEmail, password })
      .expect(200);

    await withConsumerAppScope(agent.get(`/api/consumer/documents/${invoiceResourceId}/download`)).expect(403);
  });
});
