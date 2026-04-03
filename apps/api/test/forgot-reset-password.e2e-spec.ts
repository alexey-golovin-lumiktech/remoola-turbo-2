/** @jest-environment @remoola/test-db/environment */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { $Enums, PrismaClient } from '@remoola/database-2';
import { hashPassword, hashTokenToHex } from '@remoola/security-utils';

import { assertIsolatedTestDatabaseUrl } from './test-db-safety';
import { AppModule } from '../src/app.module';
import { ConsumerAuthService } from '../src/consumer/auth/auth.service';
import { getApiConsumerCsrfTokenCookieKeysForRead } from '../src/shared-common';

describe(`Forgot/Reset password hardening (e2e, isolated DB)`, () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let authService: ConsumerAuthService;
  let consumerId: string;
  let consumerEmail: string;
  let settingsConsumerId: string;
  let settingsConsumerEmail: string;
  const initialPassword = `ForgotReset1!`;
  const updatedPassword = `ForgotReset2!`;
  const settingsInitialPassword = `SettingsReset1!`;
  const settingsUpdatedPassword = `SettingsReset2!`;
  const origin = `http://127.0.0.1:3001`;

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

  beforeAll(async () => {
    assertIsolatedTestDatabaseUrl();
    prisma = new PrismaClient();
    await prisma.$connect();

    const emailSuffix = Date.now();
    consumerEmail = `forgot-reset-${emailSuffix}@local.test`;
    const { hash, salt } = await hashPassword(initialPassword);
    const consumer = await prisma.consumerModel.create({
      data: {
        email: consumerEmail,
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.INDIVIDUAL,
        password: hash,
        salt,
      },
    });
    consumerId = consumer.id;
    settingsConsumerEmail = `settings-reset-${emailSuffix}@local.test`;
    const settingsPassword = await hashPassword(settingsInitialPassword);
    const settingsConsumer = await prisma.consumerModel.create({
      data: {
        email: settingsConsumerEmail,
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.INDIVIDUAL,
        password: settingsPassword.hash,
        salt: settingsPassword.salt,
      },
    });
    settingsConsumerId = settingsConsumer.id;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();
    authService = app.get(ConsumerAuthService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it(`forgot-password returns same generic response for existing and non-existing emails`, async () => {
    const existingRes = await request(app.getHttpServer())
      .post(`/consumer/auth/forgot-password`)
      .set(`origin`, origin)
      .set(`x-forwarded-for`, `198.51.100.11`)
      .send({ email: consumerEmail })
      .expect(200);

    const unknownRes = await request(app.getHttpServer())
      .post(`/consumer/auth/forgot-password`)
      .set(`origin`, origin)
      .set(`x-forwarded-for`, `198.51.100.12`)
      .send({ email: `unknown-${Date.now()}@local.test` })
      .expect(200);

    expect(existingRes.body).toEqual({ message: `If an account exists, we sent instructions.` });
    expect(unknownRes.body).toEqual({ message: `If an account exists, we sent instructions.` });
  });

  it(`settings password change revokes sessions and requires re-login`, async () => {
    const agent = request.agent(app.getHttpServer());
    const loginRes = await agent
      .post(`/consumer/auth/login`)
      .set(`origin`, origin)
      .set(`x-forwarded-for`, `198.51.100.18`)
      .send({ email: settingsConsumerEmail, password: settingsInitialPassword })
      .expect(200);
    const csrf = parseCookieValueForKeys(
      asCookieArray(loginRes.headers[`set-cookie`]),
      getApiConsumerCsrfTokenCookieKeysForRead(),
    );
    expect(csrf).toBeTruthy();

    const changeRes = await agent
      .patch(`/consumer/profile/password`)
      .set(`origin`, origin)
      .set(`x-csrf-token`, csrf ?? ``)
      .send({ currentPassword: settingsInitialPassword, password: settingsUpdatedPassword })
      .expect(200);
    expect(changeRes.body).toEqual({ success: true, requiresReauth: true });

    await agent
      .post(`/consumer/auth/refresh`)
      .set(`origin`, origin)
      .set(`x-csrf-token`, csrf ?? ``)
      .expect(401);

    await request(app.getHttpServer())
      .post(`/consumer/auth/login`)
      .set(`origin`, origin)
      .set(`x-forwarded-for`, `198.51.100.18`)
      .send({ email: settingsConsumerEmail, password: settingsInitialPassword })
      .expect(401);

    await request(app.getHttpServer())
      .post(`/consumer/auth/login`)
      .set(`origin`, origin)
      .set(`x-forwarded-for`, `198.51.100.18`)
      .send({ email: settingsConsumerEmail, password: settingsUpdatedPassword })
      .expect(200);

    const activeSessions = await prisma.authSessionModel.count({
      where: { consumerId: settingsConsumerId, revokedAt: null },
    });
    expect(activeSessions).toBeGreaterThanOrEqual(1);
  });

  it(`forgot-password cooldown blocks repeated token creation while preserving generic response`, async () => {
    await authService.requestPasswordReset(consumerEmail, origin);

    const rowsAfterFirst = await prisma.resetPasswordModel.findMany({
      where: { consumerId },
      orderBy: { createdAt: `desc` },
    });
    const firstCount = rowsAfterFirst.length;

    await authService.requestPasswordReset(consumerEmail, origin);

    const rowsAfterSecond = await prisma.resetPasswordModel.findMany({
      where: { consumerId },
      orderBy: { createdAt: `desc` },
    });
    expect(rowsAfterSecond.length).toBe(firstCount);
  });

  it(`new forgot-password request invalidates previously issued reset rows`, async () => {
    await prisma.resetPasswordModel.deleteMany({ where: { consumerId } });
    await prisma.resetPasswordModel.create({
      data: {
        consumerId,
        tokenHash: hashTokenToHex(`first-manual-token`),
        expiredAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await authService.requestPasswordReset(consumerEmail, origin);

    // Backdate newest row so cooldown won't block the second issuing call (test setup only).
    const newest = await prisma.resetPasswordModel.findFirst({
      where: { consumerId },
      orderBy: { createdAt: `desc` },
      select: { id: true },
    });
    expect(newest).toBeTruthy();
    await prisma.resetPasswordModel.update({
      where: { id: newest!.id },
      data: { createdAt: new Date(Date.now() - 2 * 60 * 1000) },
    });

    await authService.requestPasswordReset(consumerEmail, origin);

    const oldRow = await prisma.resetPasswordModel.findFirst({
      where: { consumerId, tokenHash: hashTokenToHex(`first-manual-token`) },
    });
    const activeRows = await prisma.resetPasswordModel.count({
      where: { consumerId, deletedAt: null, expiredAt: { gt: new Date() } },
    });
    expect(oldRow?.deletedAt).toBeTruthy();
    expect(activeRows).toBe(1);
  });

  it(`reset with invalid, expired, or used token returns the same generic error code`, async () => {
    await prisma.resetPasswordModel.deleteMany({ where: { consumerId } });

    await prisma.resetPasswordModel.create({
      data: {
        consumerId,
        tokenHash: hashTokenToHex(`expired-token`),
        expiredAt: new Date(Date.now() - 60 * 1000),
      },
    });
    await prisma.resetPasswordModel.create({
      data: {
        consumerId,
        tokenHash: hashTokenToHex(`used-token`),
        expiredAt: new Date(Date.now() + 60 * 60 * 1000),
        deletedAt: new Date(),
      },
    });

    const invalidRes = await request(app.getHttpServer())
      .post(`/consumer/auth/password/reset`)
      .set(`x-forwarded-for`, `198.51.100.15`)
      .send({ token: `definitely-invalid`, password: `SomePass1!` })
      .expect(400);
    const expiredRes = await request(app.getHttpServer())
      .post(`/consumer/auth/password/reset`)
      .set(`x-forwarded-for`, `198.51.100.15`)
      .send({ token: `expired-token`, password: `SomePass1!` })
      .expect(400);
    const usedRes = await request(app.getHttpServer())
      .post(`/consumer/auth/password/reset`)
      .set(`x-forwarded-for`, `198.51.100.15`)
      .send({ token: `used-token`, password: `SomePass1!` })
      .expect(400);

    expect(invalidRes.body?.message).toBe(`INVALID_CHANGE_PASSWORD_TOKEN`);
    expect(expiredRes.body?.message).toBe(`INVALID_CHANGE_PASSWORD_TOKEN`);
    expect(usedRes.body?.message).toBe(`INVALID_CHANGE_PASSWORD_TOKEN`);
  });

  it(`successful reset does not auto-login and old session is rejected after reset`, async () => {
    await prisma.resetPasswordModel.deleteMany({ where: { consumerId } });
    const token = `valid-reset-token`;
    await prisma.resetPasswordModel.create({
      data: {
        consumerId,
        tokenHash: hashTokenToHex(token),
        expiredAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const agent = request.agent(app.getHttpServer());
    const loginRes = await agent
      .post(`/consumer/auth/login`)
      .set(`origin`, origin)
      .set(`x-forwarded-for`, `198.51.100.16`)
      .send({ email: consumerEmail, password: initialPassword })
      .expect(200);
    const csrf = parseCookieValueForKeys(
      asCookieArray(loginRes.headers[`set-cookie`]),
      getApiConsumerCsrfTokenCookieKeysForRead(),
    );
    expect(csrf).toBeTruthy();

    const resetRes = await request(app.getHttpServer())
      .post(`/consumer/auth/password/reset`)
      .set(`x-forwarded-for`, `198.51.100.16`)
      .send({ token, password: updatedPassword })
      .expect(200);
    expect(resetRes.body).toEqual({ success: true });
    expect(resetRes.headers[`set-cookie`]).toBeUndefined();

    await agent
      .post(`/consumer/auth/refresh`)
      .set(`origin`, origin)
      .set(`x-csrf-token`, csrf ?? ``)
      .expect(401);
    await request(app.getHttpServer())
      .post(`/consumer/auth/login`)
      .set(`origin`, origin)
      .set(`x-forwarded-for`, `198.51.100.19`)
      .send({ email: consumerEmail, password: initialPassword })
      .expect(401);
    const loginWithNewPassword = await authService.login({ email: consumerEmail, password: updatedPassword });
    expect(loginWithNewPassword.identity?.email).toBe(consumerEmail);
  });

  it(`concurrent reset attempts for the same token allow only one success`, async () => {
    await prisma.resetPasswordModel.deleteMany({ where: { consumerId } });
    const token = `concurrent-token`;
    await prisma.resetPasswordModel.create({
      data: {
        consumerId,
        tokenHash: hashTokenToHex(token),
        expiredAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const [a, b] = await Promise.allSettled([
      authService.resetPasswordWithToken(token, `Concurrent1!`),
      authService.resetPasswordWithToken(token, `Concurrent2!`),
    ]);
    const settled = [a, b];
    const fulfilledCount = settled.filter((r) => r.status === `fulfilled`).length;
    const rejectedCount = settled.filter((r) => r.status === `rejected`).length;
    expect(fulfilledCount).toBe(1);
    expect(rejectedCount).toBe(1);
    const rejected = settled.find((r): r is PromiseRejectedResult => r.status === `rejected`);
    expect(String(rejected?.reason?.response?.message ?? ``)).toContain(`INVALID_CHANGE_PASSWORD_TOKEN`);
  });

  it(`forgot-password and reset endpoints enforce rate limiting`, async () => {
    const ipForgot = `198.51.100.101`;
    let throttledForgot = false;
    for (let i = 0; i < 6; i += 1) {
      const res = await request(app.getHttpServer())
        .post(`/consumer/auth/forgot-password`)
        .set(`origin`, origin)
        .set(`x-forwarded-for`, ipForgot)
        .send({ email: `rate-limit-forgot-${Date.now()}-${i}@local.test` });
      if (res.status === 429) throttledForgot = true;
    }
    expect(throttledForgot).toBe(true);

    const ipReset = `198.51.100.102`;
    let throttledReset = false;
    for (let i = 0; i < 11; i += 1) {
      const res = await request(app.getHttpServer())
        .post(`/consumer/auth/password/reset`)
        .set(`x-forwarded-for`, ipReset)
        .send({ token: `invalid-${i}`, password: `RateLimit1!` });
      if (res.status === 429) throttledReset = true;
    }
    expect(throttledReset).toBe(true);
  });
});
