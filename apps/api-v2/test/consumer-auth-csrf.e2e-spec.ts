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

import { $Enums, PrismaClient } from '@remoola/database-2';
import { hashPassword } from '@remoola/security-utils';

import { assertIsolatedTestDatabaseUrl } from './test-db-safety';
import { AppModule } from '../src/app.module';
import { envs } from '../src/envs';
import { AuthGuard } from '../src/guards/auth.guard';
import { PrismaService } from '../src/shared/prisma.service';
import { CSRF_TOKEN_COOKIE_KEY } from '../src/shared-common';

describe(`Consumer auth CSRF contracts (e2e, isolated DB)`, () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const consumerEmail = `csrf-e2e-consumer@local.test`;
  const consumerPassword = `CsrfContract1!`;

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

  it(`POST /consumer/auth/refresh-access rejects without CSRF`, () => {
    return request(app.getHttpServer())
      .post(`/api/consumer/auth/refresh-access`)
      .send({ refreshToken: `legacy-refresh-token` })
      .expect(401);
  });

  it(`POST /consumer/auth/logout rejects without CSRF`, () => {
    return request(app.getHttpServer()).post(`/api/consumer/auth/logout`).expect(401);
  });

  it(`POST /consumer/auth/logout-all rejects without CSRF`, () => {
    return request(app.getHttpServer()).post(`/api/consumer/auth/logout-all`).expect(401);
  });

  it(`POST /consumer/auth/refresh accepts matching CSRF pair and fails later on missing refresh token`, async () => {
    const csrf = `csrf-e2e-token`;
    const response = await request(app.getHttpServer())
      .post(`/api/consumer/auth/refresh`)
      .set(`x-csrf-token`, csrf)
      .set(`Cookie`, `${CSRF_TOKEN_COOKIE_KEY}=${csrf}`)
      .expect(401);

    expect(response.body?.message).not.toBe(`Invalid CSRF token`);
  });

  it(`POST /consumer/auth/refresh succeeds with login cookies and matching CSRF header`, async () => {
    const agent = request.agent(app.getHttpServer());
    const loginRes = await agent
      .post(`/api/consumer/auth/login`)
      .send({ email: consumerEmail, password: consumerPassword })
      .expect(201);
    const csrf = parseCookieValue(asCookieArray(loginRes.headers[`set-cookie`]), CSRF_TOKEN_COOKIE_KEY);
    expect(csrf).toBeTruthy();
    await agent
      .post(`/api/consumer/auth/refresh`)
      .set(`x-csrf-token`, csrf ?? ``)
      .expect(201);
  });

  it(`POST /consumer/auth/refresh-access succeeds with login cookies and matching CSRF header`, async () => {
    const agent = request.agent(app.getHttpServer());
    const loginRes = await agent
      .post(`/api/consumer/auth/login`)
      .send({ email: consumerEmail, password: consumerPassword })
      .expect(201);
    const cookies = asCookieArray(loginRes.headers[`set-cookie`]);
    const csrf = parseCookieValue(cookies, CSRF_TOKEN_COOKIE_KEY);
    const refreshCookie = cookies?.find((cookie) => /refresh/i.test(cookie.split(`=`)[0] ?? ``));
    const refreshToken = refreshCookie ? refreshCookie.split(`=`)[1]?.split(`;`)[0] : null;

    expect(csrf).toBeTruthy();
    expect(refreshToken).toBeTruthy();

    await agent
      .post(`/api/consumer/auth/refresh-access`)
      .set(`x-csrf-token`, csrf ?? ``)
      .send({ refreshToken })
      .expect(201);
  });

  it(`POST /consumer/auth/logout succeeds with login cookies and matching CSRF header`, async () => {
    const agent = request.agent(app.getHttpServer());
    const loginRes = await agent
      .post(`/api/consumer/auth/login`)
      .send({ email: consumerEmail, password: consumerPassword })
      .expect(201);
    const csrf = parseCookieValue(asCookieArray(loginRes.headers[`set-cookie`]), CSRF_TOKEN_COOKIE_KEY);
    expect(csrf).toBeTruthy();
    await agent
      .post(`/api/consumer/auth/logout`)
      .set(`x-csrf-token`, csrf ?? ``)
      .expect(200);
  });

  it(`POST /consumer/auth/logout-all revokes all active sessions and invalidates auth`, async () => {
    const agentA = request.agent(app.getHttpServer());
    const loginA = await agentA
      .post(`/api/consumer/auth/login`)
      .send({ email: consumerEmail, password: consumerPassword })
      .expect(201);
    const csrfA = parseCookieValue(asCookieArray(loginA.headers[`set-cookie`]), CSRF_TOKEN_COOKIE_KEY);
    expect(csrfA).toBeTruthy();

    const agentB = request.agent(app.getHttpServer());
    const loginB = await agentB
      .post(`/api/consumer/auth/login`)
      .send({ email: consumerEmail, password: consumerPassword })
      .expect(201);
    const csrfB = parseCookieValue(asCookieArray(loginB.headers[`set-cookie`]), CSRF_TOKEN_COOKIE_KEY);
    expect(csrfB).toBeTruthy();

    await agentA
      .post(`/api/consumer/auth/logout-all`)
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
    await agentB
      .post(`/api/consumer/auth/refresh`)
      .set(`x-csrf-token`, csrfB ?? ``)
      .expect(401);
  });
});
