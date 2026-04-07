/**
 * E2E CSRF contract tests for consumer refresh/logout/logout-all endpoints.
 * Uses an isolated temporary DB per run via @remoola/test-db/environment.
 */
/** @jest-environment @remoola/test-db/environment */

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
import { getApiConsumerCsrfTokenCookieKeysForRead } from '../src/shared-common';

describe(`Consumer auth CSRF contracts (e2e, isolated DB)`, () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const consumerEmail = `csrf-e2e-consumer@local.test`;
  const consumerPassword = `CsrfContract1!`;
  const consumerOrigin = `http://127.0.0.1:3001`;
  const appScope = `consumer` as const;

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
    const { hash, salt } = await hashPassword(consumerPassword);
    await prisma.consumerModel.create({
      data: {
        email: consumerEmail,
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.INDIVIDUAL,
        password: hash,
        salt,
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

  it(`POST /consumer/auth/refresh rejects without CSRF`, () => {
    return request(app.getHttpServer()).post(`/api/consumer/auth/refresh`).expect(401);
  });

  it(`POST /consumer/auth/logout rejects without CSRF`, () => {
    return request(app.getHttpServer()).post(`/api/consumer/auth/logout`).expect(401);
  });

  it(`POST /consumer/auth/logout-all rejects without CSRF`, () => {
    return request(app.getHttpServer()).post(`/api/consumer/auth/logout-all`).expect(401);
  });

  it(`POST /consumer/auth/refresh accepts matching CSRF pair and fails later on missing refresh token`, async () => {
    const csrf = `csrf-e2e-token`;
    const response = await withConsumerAppScope(request(app.getHttpServer()).post(`/api/consumer/auth/refresh`))
      .set(`x-csrf-token`, csrf)
      .set(`Cookie`, `${getApiConsumerCsrfTokenCookieKeysForRead(appScope)[0]}=${csrf}`)
      .expect(401);

    expect(response.body?.message).not.toBe(`Invalid CSRF token`);
  });

  it(`POST /consumer/auth/refresh succeeds with login cookies and matching CSRF header`, async () => {
    const agent = request.agent(app.getHttpServer());
    const loginRes = await withConsumerAppScope(agent.post(`/api/consumer/auth/login?appScope=${appScope}`))
      .send({ email: consumerEmail, password: consumerPassword })
      .expect(200);
    const csrf = parseCookieValueForKeys(
      asCookieArray(loginRes.headers[`set-cookie`]),
      getApiConsumerCsrfTokenCookieKeysForRead(appScope),
    );
    expect(csrf).toBeTruthy();
    await withConsumerAppScope(agent.post(`/api/consumer/auth/refresh`))
      .set(`x-csrf-token`, csrf ?? ``)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ ok: true });
      });
  });

  it(`POST /consumer/auth/logout succeeds with login cookies and matching CSRF header`, async () => {
    const agent = request.agent(app.getHttpServer());
    const loginRes = await withConsumerAppScope(agent.post(`/api/consumer/auth/login?appScope=${appScope}`))
      .send({ email: consumerEmail, password: consumerPassword })
      .expect(200);
    const csrf = parseCookieValueForKeys(
      asCookieArray(loginRes.headers[`set-cookie`]),
      getApiConsumerCsrfTokenCookieKeysForRead(appScope),
    );
    expect(csrf).toBeTruthy();
    await withConsumerAppScope(agent.post(`/api/consumer/auth/logout`))
      .set(`x-csrf-token`, csrf ?? ``)
      .expect(200);
  });

  it(`POST /consumer/auth/logout-all revokes all active sessions and invalidates auth`, async () => {
    const agentA = request.agent(app.getHttpServer());
    const loginA = await withConsumerAppScope(agentA.post(`/api/consumer/auth/login?appScope=${appScope}`))
      .send({ email: consumerEmail, password: consumerPassword })
      .expect(200);
    const csrfA = parseCookieValueForKeys(
      asCookieArray(loginA.headers[`set-cookie`]),
      getApiConsumerCsrfTokenCookieKeysForRead(appScope),
    );
    expect(csrfA).toBeTruthy();

    const agentB = request.agent(app.getHttpServer());
    const loginB = await withConsumerAppScope(agentB.post(`/api/consumer/auth/login?appScope=${appScope}`))
      .send({ email: consumerEmail, password: consumerPassword })
      .expect(200);
    const csrfB = parseCookieValueForKeys(
      asCookieArray(loginB.headers[`set-cookie`]),
      getApiConsumerCsrfTokenCookieKeysForRead(appScope),
    );
    expect(csrfB).toBeTruthy();

    await withConsumerAppScope(agentA.post(`/api/consumer/auth/logout-all`))
      .set(`x-csrf-token`, csrfA ?? ``)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ ok: true });
      });

    const consumer = await prisma.consumerModel.findFirst({
      where: { email: consumerEmail },
      select: { id: true },
    });
    expect(consumer?.id).toBeTruthy();

    const activeSessions = await prisma.authSessionModel.count({
      where: {
        consumerId: consumer?.id,
        revokedAt: null,
      },
    });
    expect(activeSessions).toBe(0);

    const logoutAllRevoked = await prisma.authSessionModel.count({
      where: {
        consumerId: consumer?.id,
        invalidatedReason: `logout_all`,
      },
    });
    expect(logoutAllRevoked).toBeGreaterThanOrEqual(2);

    await agentA.get(`/api/consumer/auth/me`).expect(401);
    await withConsumerAppScope(agentB.post(`/api/consumer/auth/refresh`))
      .set(`x-csrf-token`, csrfB ?? ``)
      .expect(401);
  });
});
