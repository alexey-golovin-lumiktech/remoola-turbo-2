/**
 * E2E OAuth full-flow tests for start -> callback -> complete -> me contracts.
 * Uses an isolated temporary DB per run via @remoola/test-db/environment.
 */
/** @jest-environment @remoola/test-db/environment */

import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';

import { type ConsumerAppScope } from '@remoola/api-types';
import { $Enums, PrismaClient } from '@remoola/database-2';
import { hashPassword, oauthCrypto } from '@remoola/security-utils';

import { assertIsolatedTestDatabaseUrl } from './test-db-safety';
import { AppModule } from '../src/app.module';
import { GoogleOAuthService } from '../src/consumer/auth/google-oauth.service';
import { envs } from '../src/envs';
import { AuthGuard } from '../src/guards/auth.guard';
import { PrismaService } from '../src/shared/prisma.service';
import { getApiOAuthStateCookieKeysForRead } from '../src/shared-common';

describe(`Consumer auth OAuth full flow (e2e, isolated DB)`, () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const consumerEmail = `oauth-existing-consumer@local.test`;
  const consumerPassword = `OauthConsumer1!`;
  const appOrigins: Record<ConsumerAppScope, string> = {
    consumer: `http://127.0.0.1:3001`,
    'consumer-mobile': `http://127.0.0.1:3002`,
    'consumer-css-grid': `http://127.0.0.1:3003`,
  };
  let consumerId = ``;
  let initialConsumerOrigin: string;
  let initialConsumerMobileOrigin: string;
  let initialConsumerCssGridOrigin: string;

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
    initialConsumerOrigin = envs.CONSUMER_APP_ORIGIN;
    initialConsumerMobileOrigin = envs.CONSUMER_MOBILE_APP_ORIGIN;
    initialConsumerCssGridOrigin = envs.CONSUMER_CSS_GRID_APP_ORIGIN;
    envs.CONSUMER_APP_ORIGIN = appOrigins.consumer;
    envs.CONSUMER_MOBILE_APP_ORIGIN = appOrigins[`consumer-mobile`];
    envs.CONSUMER_CSS_GRID_APP_ORIGIN = appOrigins[`consumer-css-grid`];
    prisma = new PrismaClient();
    await prisma.$connect();

    const { hash, salt } = await hashPassword(consumerPassword);
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

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const googleOAuthService = moduleFixture.get(GoogleOAuthService);
    jest.spyOn(googleOAuthService, `buildAuthorizationUrl`).mockImplementation((state) => {
      return `https://accounts.google.test/o/oauth2/v2/auth?state=${encodeURIComponent(state)}`;
    });
    jest.spyOn(googleOAuthService, `exchangeCodeForPayload`).mockResolvedValue({
      email: consumerEmail,
      email_verified: true,
      sub: `google-sub-e2e`,
      given_name: `OAuth`,
      family_name: `User`,
      name: `OAuth User`,
      aud: envs.GOOGLE_CLIENT_ID,
      iss: `https://accounts.google.com`,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300,
    });
    jest.spyOn(googleOAuthService, `loginWithPayload`).mockImplementation(async () => {
      const existing = await prisma.consumerModel.findUniqueOrThrow({
        where: { id: consumerId },
        include: { personalDetails: true },
      });
      return existing;
    });

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
    envs.CONSUMER_APP_ORIGIN = initialConsumerOrigin;
    envs.CONSUMER_MOBILE_APP_ORIGIN = initialConsumerMobileOrigin;
    envs.CONSUMER_CSS_GRID_APP_ORIGIN = initialConsumerCssGridOrigin;
    await prisma.$disconnect();
    await app.close();
  });

  it.each([
    [`consumer`, appOrigins.consumer],
    [`consumer-mobile`, appOrigins[`consumer-mobile`]],
    [`consumer-css-grid`, appOrigins[`consumer-css-grid`]],
  ] as const)(`completes OAuth full flow for %s`, async (appScope, consumerOrigin) => {
    const oauthAgent = request.agent(app.getHttpServer());

    const startRes = await oauthAgent
      .get(`/api/consumer/auth/google/start`)
      .set(`origin`, consumerOrigin)
      .query({ appScope, next: `/dashboard` })
      .expect(302);
    expect(startRes.headers.location).toContain(`accounts.google.test`);
    const startUrl = new URL(startRes.headers.location as string);
    const state = startUrl.searchParams.get(`state`);
    expect(state).toBeTruthy();

    const stateCookie = parseCookieValueForKeys(
      asCookieArray(startRes.headers[`set-cookie`]),
      getApiOAuthStateCookieKeysForRead(appScope),
    );
    expect(stateCookie).toBeTruthy();
    expect(stateCookie).toBe(state);

    const callbackRes = await oauthAgent
      .get(`/api/consumer/auth/google/callback`)
      .set(`origin`, consumerOrigin)
      .query({ code: `oauth-code`, state })
      .expect(302);
    expect(callbackRes.headers.location).toContain(`oauthHandoff=`);
    expect(callbackRes.headers.location).toContain(`${consumerOrigin}/auth/callback`);

    const callbackUrl = new URL(callbackRes.headers.location as string);
    const handoffToken = callbackUrl.searchParams.get(`oauthHandoff`);
    expect(handoffToken).toBeTruthy();

    const stateKey = oauthCrypto.hashOAuthState(state ?? ``);
    const stateRows = await prisma.oauthStateModel.count({
      where: { stateKey },
    });
    expect(stateRows).toBe(0);

    await oauthAgent
      .post(`/api/consumer/auth/oauth/complete`)
      .set(`origin`, consumerOrigin)
      .send({ handoffToken })
      .expect(200);

    const meRes = await oauthAgent.get(`/api/consumer/auth/me`).set(`origin`, consumerOrigin).expect(200);
    expect(meRes.body?.id).toBe(consumerId);
    expect(meRes.body?.email).toBe(consumerEmail);
  });
});
