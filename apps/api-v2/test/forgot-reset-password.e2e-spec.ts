/** @jest-environment @remoola/test-db/environment */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { CONSUMER_APP_SCOPE_HEADER } from '@remoola/api-types';
import { $Enums, PrismaClient } from '@remoola/database-2';
import { hashPassword, hashTokenToHex } from '@remoola/security-utils';

import { assertIsolatedTestDatabaseUrl } from './test-db-safety';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { ConsumerAuthService } from '../src/consumer/auth/auth.service';
import { envs } from '../src/envs';
import { MailingService } from '../src/shared/mailing.service';
import {
  getApiConsumerAccessTokenCookieKey,
  getApiConsumerCsrfTokenCookieKeysForRead,
  getApiConsumerRefreshTokenCookieKey,
} from '../src/shared-common';

type SessionIssuerForTest = {
  createSessionAndIssueTokens(
    identityId: string,
    appScope: string,
    sessionFamilyId?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    sessionId: string;
    sessionFamilyId: string;
  }>;
};

describe(`Forgot/Reset password hardening (e2e, isolated DB)`, () => {
  let app: NestExpressApplication;
  let prisma: PrismaClient;
  let authService: ConsumerAuthService;
  let consumerId: string;
  let consumerEmail: string;
  let settingsConsumerId: string;
  let settingsConsumerEmail: string;
  let googleOnlyConsumerEmail: string;
  let googleOnlyConsumerId: string;
  let mailingService: MailingService;
  let initialConsumerOrigin: string;
  let initialConsumerCssGridOrigin: string;
  const initialPassword = `ForgotReset1!`;
  const updatedPassword = `ForgotReset2!`;
  const settingsInitialPassword = `SettingsReset1!`;
  const settingsUpdatedPassword = `SettingsReset2!`;
  const googleOnlyCreatedPassword = `GoogleCreated1!`;
  const origin = `http://127.0.0.1:3003`;
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
    return req.set(`origin`, origin).set(CONSUMER_APP_SCOPE_HEADER, appScope);
  }

  beforeAll(async () => {
    assertIsolatedTestDatabaseUrl();
    initialConsumerOrigin = envs.CONSUMER_APP_ORIGIN;
    initialConsumerCssGridOrigin = envs.CONSUMER_CSS_GRID_APP_ORIGIN;
    envs.CONSUMER_APP_ORIGIN = origin;
    envs.CONSUMER_CSS_GRID_APP_ORIGIN = origin;
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
    googleOnlyConsumerEmail = `google-only-${emailSuffix}@local.test`;
    const googleOnlyConsumer = await prisma.consumerModel.create({
      data: {
        email: googleOnlyConsumerEmail,
        accountType: $Enums.AccountType.CONTRACTOR,
        contractorKind: $Enums.ContractorKind.INDIVIDUAL,
        password: null,
        salt: null,
      },
    });
    googleOnlyConsumerId = googleOnlyConsumer.id;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
    authService = app.get(ConsumerAuthService);
    mailingService = app.get(MailingService);
    jest.spyOn(mailingService, `sendConsumerForgotPasswordEmail`).mockResolvedValue(undefined);
    jest.spyOn(mailingService, `sendConsumerPasswordlessRecoveryEmail`).mockResolvedValue(undefined);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    envs.CONSUMER_APP_ORIGIN = initialConsumerOrigin;
    envs.CONSUMER_CSS_GRID_APP_ORIGIN = initialConsumerCssGridOrigin;
    await prisma.$disconnect();
    await app.close();
  });

  it(`forgot-password returns the same provider-aware response across account states`, async () => {
    const existingRes = await withConsumerAppScope(
      request(app.getHttpServer()).post(`/api/consumer/auth/forgot-password?appScope=${appScope}`),
    )
      .set(`x-forwarded-for`, `198.51.100.11`)
      .send({ email: consumerEmail })
      .expect(200);

    const passwordlessRes = await withConsumerAppScope(
      request(app.getHttpServer()).post(`/api/consumer/auth/forgot-password?appScope=${appScope}`),
    )
      .set(`x-forwarded-for`, `198.51.100.13`)
      .send({ email: googleOnlyConsumerEmail })
      .expect(200);

    const unknownRes = await withConsumerAppScope(
      request(app.getHttpServer()).post(`/api/consumer/auth/forgot-password?appScope=${appScope}`),
    )
      .set(`x-forwarded-for`, `198.51.100.12`)
      .send({ email: `unknown-${Date.now()}@local.test` })
      .expect(200);

    expect(existingRes.body).toEqual({
      message: `If an account exists, we sent recovery instructions.`,
      recoveryMode: `provider_aware`,
    });
    expect(passwordlessRes.body).toEqual(existingRes.body);
    expect(unknownRes.body).toEqual(existingRes.body);
  });

  it(`forgot-password sends Google guidance for passwordless consumers without creating reset rows`, async () => {
    await prisma.resetPasswordModel.deleteMany({ where: { consumerId: googleOnlyConsumerId } });

    await withConsumerAppScope(
      request(app.getHttpServer()).post(`/api/consumer/auth/forgot-password?appScope=${appScope}`),
    )
      .set(`x-forwarded-for`, `198.51.100.14`)
      .send({ email: googleOnlyConsumerEmail })
      .expect(200);

    expect(mailingService.sendConsumerPasswordlessRecoveryEmail).toHaveBeenCalledWith({
      email: googleOnlyConsumerEmail,
      loginUrl: `${origin}/login?auth_notice=google_signin_required`,
    });
    expect(mailingService.sendConsumerForgotPasswordEmail).not.toHaveBeenCalledWith(
      expect.objectContaining({ email: googleOnlyConsumerEmail }),
    );
    const googleOnlyResetRows = await prisma.resetPasswordModel.count({
      where: { consumerId: googleOnlyConsumerId },
    });
    expect(googleOnlyResetRows).toBe(0);
  });

  it(`forgot-password email link omits referer and verify redirects by stored app scope`, async () => {
    await prisma.resetPasswordModel.deleteMany({ where: { consumerId } });

    await withConsumerAppScope(
      request(app.getHttpServer()).post(`/api/consumer/auth/forgot-password?appScope=${appScope}`),
    )
      .set(`x-forwarded-for`, `198.51.100.17`)
      .send({ email: consumerEmail })
      .expect(200);

    const mailPayload = (mailingService.sendConsumerForgotPasswordEmail as jest.Mock).mock.calls[0]?.[0] as
      | { forgotPasswordLink: string }
      | undefined;
    expect(mailPayload?.forgotPasswordLink).toBeTruthy();

    const verifyUrl = new URL(mailPayload!.forgotPasswordLink);
    const token = verifyUrl.searchParams.get(`token`);
    expect(token).toBeTruthy();
    expect(verifyUrl.searchParams.has(`referer`)).toBe(false);
    const localVerifyPath = `${verifyUrl.pathname}?${verifyUrl.searchParams.toString()}`;

    const verifyRes = await request(app.getHttpServer()).get(localVerifyPath).expect(302);

    expect(verifyRes.headers.location).toBe(`${origin}/forgot-password/confirm?token=${token}`);
  });

  it(`forgot-password verify redirects expired tokens without token or referer query dependence`, async () => {
    await prisma.resetPasswordModel.deleteMany({ where: { consumerId } });
    await prisma.resetPasswordModel.create({
      data: {
        consumerId,
        appScope,
        tokenHash: hashTokenToHex(`expired-verify-token`),
        expiredAt: new Date(Date.now() - 60 * 1000),
      },
    });

    const verifyRes = await request(app.getHttpServer())
      .get(`/api/consumer/auth/forgot-password/verify`)
      .query({ token: `expired-verify-token` })
      .expect(302);

    expect(verifyRes.headers.location).toBe(`${origin}/forgot-password/confirm`);
  });

  it(`forgot-password verify falls back to the default app for invalid tokens without requiring referer`, async () => {
    const verifyRes = await request(app.getHttpServer())
      .get(`/api/consumer/auth/forgot-password/verify`)
      .query({ token: `invalid-verify-token` })
      .expect(400);

    expect(verifyRes.body?.message).toBe(`ORIGIN_REQUIRED`);
  });

  it(`settings password change revokes sessions and requires re-login`, async () => {
    const agent = request.agent(app.getHttpServer());
    const loginRes = await withConsumerAppScope(agent.post(`/api/consumer/auth/login?appScope=${appScope}`))
      .set(`x-forwarded-for`, `198.51.100.18`)
      .send({ email: settingsConsumerEmail, password: settingsInitialPassword })
      .expect(200);
    const csrf = parseCookieValueForKeys(
      asCookieArray(loginRes.headers[`set-cookie`]),
      getApiConsumerCsrfTokenCookieKeysForRead(`consumer-css-grid`),
    );
    expect(csrf).toBeTruthy();

    const changeRes = await withConsumerAppScope(agent.patch(`/api/consumer/profile/password`))
      .set(`x-csrf-token`, csrf ?? ``)
      .send({ currentPassword: settingsInitialPassword, password: settingsUpdatedPassword })
      .expect(200);
    expect(changeRes.body).toEqual({ success: true, requiresReauth: true });

    await withConsumerAppScope(agent.post(`/api/consumer/auth/refresh`))
      .set(`x-csrf-token`, csrf ?? ``)
      .expect(401);

    await withConsumerAppScope(request(app.getHttpServer()).post(`/api/consumer/auth/login?appScope=${appScope}`))
      .set(`x-forwarded-for`, `198.51.100.18`)
      .send({ email: settingsConsumerEmail, password: settingsInitialPassword })
      .expect(401);

    await withConsumerAppScope(request(app.getHttpServer()).post(`/api/consumer/auth/login?appScope=${appScope}`))
      .set(`x-forwarded-for`, `198.51.100.18`)
      .send({ email: settingsConsumerEmail, password: settingsUpdatedPassword })
      .expect(200);

    const activeSessions = await prisma.authSessionModel.count({
      where: { consumerId: settingsConsumerId, revokedAt: null },
    });
    expect(activeSessions).toBeGreaterThanOrEqual(1);
  });

  it(`settings password endpoint lets passwordless consumers create a first password`, async () => {
    const issued = await (authService as unknown as SessionIssuerForTest).createSessionAndIssueTokens(
      googleOnlyConsumerId,
      appScope,
    );
    const csrf = `csrf-passwordless-google`;
    const authCookies = [
      `${getApiConsumerAccessTokenCookieKey(undefined, `consumer-css-grid`)}=${issued.accessToken}`,
      `${getApiConsumerRefreshTokenCookieKey(undefined, `consumer-css-grid`)}=${issued.refreshToken}`,
      `${getApiConsumerCsrfTokenCookieKeysForRead(`consumer-css-grid`)[0]}=${csrf}`,
    ];

    const changeRes = await withConsumerAppScope(request(app.getHttpServer()).patch(`/api/consumer/profile/password`))
      .set(`Cookie`, authCookies)
      .set(`x-csrf-token`, csrf)
      .send({ password: googleOnlyCreatedPassword })
      .expect(200);
    expect(changeRes.body).toEqual({ success: true, requiresReauth: true });

    await withConsumerAppScope(request(app.getHttpServer()).post(`/api/consumer/auth/refresh`))
      .set(`Cookie`, authCookies)
      .set(`x-csrf-token`, csrf)
      .expect(401);

    const updatedConsumer = await prisma.consumerModel.findUnique({
      where: { id: googleOnlyConsumerId },
      select: { password: true, salt: true },
    });
    expect(updatedConsumer?.password).toBeTruthy();
    expect(updatedConsumer?.salt).toBeTruthy();

    await withConsumerAppScope(request(app.getHttpServer()).post(`/api/consumer/auth/login?appScope=${appScope}`))
      .set(`x-forwarded-for`, `198.51.100.21`)
      .send({ email: googleOnlyConsumerEmail, password: googleOnlyCreatedPassword })
      .expect(200);
  });

  it(`forgot-password cooldown blocks repeated token creation while preserving generic response`, async () => {
    await authService.requestPasswordReset(consumerEmail, appScope);

    const rowsAfterFirst = await prisma.resetPasswordModel.findMany({
      where: { consumerId },
      orderBy: { createdAt: `desc` },
    });
    const firstCount = rowsAfterFirst.length;

    await authService.requestPasswordReset(consumerEmail, appScope);

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
        appScope,
        tokenHash: hashTokenToHex(`first-manual-token`),
        expiredAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await authService.requestPasswordReset(consumerEmail, appScope);

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

    await authService.requestPasswordReset(consumerEmail, appScope);

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
        appScope,
        tokenHash: hashTokenToHex(`expired-token`),
        expiredAt: new Date(Date.now() - 60 * 1000),
      },
    });
    await prisma.resetPasswordModel.create({
      data: {
        consumerId,
        appScope,
        tokenHash: hashTokenToHex(`used-token`),
        expiredAt: new Date(Date.now() + 60 * 60 * 1000),
        deletedAt: new Date(),
      },
    });

    const invalidRes = await withConsumerAppScope(
      request(app.getHttpServer()).post(`/api/consumer/auth/password/reset`),
    )
      .set(`x-forwarded-for`, `198.51.100.15`)
      .send({ token: `definitely-invalid`, password: `SomePass1!` })
      .expect(400);
    const expiredRes = await withConsumerAppScope(
      request(app.getHttpServer()).post(`/api/consumer/auth/password/reset`),
    )
      .set(`x-forwarded-for`, `198.51.100.15`)
      .send({ token: `expired-token`, password: `SomePass1!` })
      .expect(400);
    const usedRes = await withConsumerAppScope(request(app.getHttpServer()).post(`/api/consumer/auth/password/reset`))
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
        appScope,
        tokenHash: hashTokenToHex(token),
        expiredAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const agent = request.agent(app.getHttpServer());
    const loginRes = await withConsumerAppScope(agent.post(`/api/consumer/auth/login?appScope=${appScope}`))
      .set(`x-forwarded-for`, `198.51.100.16`)
      .send({ email: consumerEmail, password: initialPassword })
      .expect(200);
    const csrf = parseCookieValueForKeys(
      asCookieArray(loginRes.headers[`set-cookie`]),
      getApiConsumerCsrfTokenCookieKeysForRead(`consumer-css-grid`),
    );
    expect(csrf).toBeTruthy();

    const resetRes = await withConsumerAppScope(request(app.getHttpServer()).post(`/api/consumer/auth/password/reset`))
      .set(`x-forwarded-for`, `198.51.100.16`)
      .send({ token, password: updatedPassword })
      .expect(200);
    expect(resetRes.body).toEqual({ success: true });
    expect(asCookieArray(resetRes.headers[`set-cookie`]) ?? []).toEqual(
      expect.not.arrayContaining([
        expect.stringContaining(`access_token`),
        expect.stringContaining(`refresh_token`),
        expect.stringContaining(`csrf_token`),
      ]),
    );

    await withConsumerAppScope(agent.post(`/api/consumer/auth/refresh`))
      .set(`x-csrf-token`, csrf ?? ``)
      .expect(401);
    await withConsumerAppScope(request(app.getHttpServer()).post(`/api/consumer/auth/login?appScope=${appScope}`))
      .set(`x-forwarded-for`, `198.51.100.19`)
      .send({ email: consumerEmail, password: initialPassword })
      .expect(401);
    const loginWithNewPassword = await authService.login({ email: consumerEmail, password: updatedPassword }, appScope);
    expect(loginWithNewPassword.identity?.email).toBe(consumerEmail);
  });

  it(`concurrent reset attempts for the same token allow only one success`, async () => {
    await prisma.resetPasswordModel.deleteMany({ where: { consumerId } });
    const token = `concurrent-token`;
    await prisma.resetPasswordModel.create({
      data: {
        consumerId,
        appScope,
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
      const res = await withConsumerAppScope(
        request(app.getHttpServer()).post(`/api/consumer/auth/forgot-password?appScope=${appScope}`),
      )
        .set(`x-forwarded-for`, ipForgot)
        .send({ email: `rate-limit-forgot-${Date.now()}-${i}@local.test` });
      if (res.status === 429) throttledForgot = true;
    }
    expect(throttledForgot).toBe(true);

    const ipReset = `198.51.100.102`;
    let throttledReset = false;
    for (let i = 0; i < 11; i += 1) {
      const res = await withConsumerAppScope(request(app.getHttpServer()).post(`/api/consumer/auth/password/reset`))
        .set(`x-forwarded-for`, ipReset)
        .send({ token: `invalid-${i}`, password: `RateLimit1!` });
      if (res.status === 429) throttledReset = true;
    }
    expect(throttledReset).toBe(true);
  });
});
