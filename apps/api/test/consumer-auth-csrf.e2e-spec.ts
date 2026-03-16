/** @jest-environment @remoola/test-db/environment */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { $Enums, PrismaClient } from '@remoola/database-2';
import { hashPassword } from '@remoola/security-utils';

import { assertIsolatedTestDatabaseUrl } from './test-db-safety';
import { AppModule } from '../src/app.module';
import { envs } from '../src/envs';
import { CSRF_TOKEN_COOKIE_KEY } from '../src/shared-common';

describe(`Consumer auth CSRF contracts (e2e)`, () => {
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
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it(`POST /consumer/auth/refresh rejects without CSRF`, () => {
    return request(app.getHttpServer()).post(`/consumer/auth/refresh`).expect(401);
  });

  it(`POST /consumer/auth/logout rejects without CSRF`, () => {
    return request(app.getHttpServer()).post(`/consumer/auth/logout`).expect(401);
  });

  it(`POST /consumer/auth/logout-all rejects without CSRF`, () => {
    return request(app.getHttpServer()).post(`/consumer/auth/logout-all`).expect(401);
  });

  it(`POST /consumer/auth/refresh accepts matching CSRF pair and fails later on missing refresh token`, async () => {
    const csrf = `csrf-e2e-token`;
    const response = await request(app.getHttpServer())
      .post(`/consumer/auth/refresh`)
      .set(`x-csrf-token`, csrf)
      .set(`Cookie`, `${CSRF_TOKEN_COOKIE_KEY}=${csrf}`)
      .expect(401);

    expect(response.body?.message).not.toBe(`Invalid CSRF token`);
  });

  it(`POST /consumer/auth/refresh succeeds with login cookies and matching CSRF header`, async () => {
    const agent = request.agent(app.getHttpServer());
    const loginRes = await agent
      .post(`/consumer/auth/login`)
      .send({ email: consumerEmail, password: consumerPassword })
      .expect(201);
    const csrf = parseCookieValue(asCookieArray(loginRes.headers[`set-cookie`]), CSRF_TOKEN_COOKIE_KEY);
    expect(csrf).toBeTruthy();
    await agent
      .post(`/consumer/auth/refresh`)
      .set(`x-csrf-token`, csrf ?? ``)
      .expect(201);
  });

  it(`POST /consumer/auth/logout succeeds with login cookies and matching CSRF header`, async () => {
    const agent = request.agent(app.getHttpServer());
    const loginRes = await agent
      .post(`/consumer/auth/login`)
      .send({ email: consumerEmail, password: consumerPassword })
      .expect(201);
    const csrf = parseCookieValue(asCookieArray(loginRes.headers[`set-cookie`]), CSRF_TOKEN_COOKIE_KEY);
    expect(csrf).toBeTruthy();
    await agent
      .post(`/consumer/auth/logout`)
      .set(`x-csrf-token`, csrf ?? ``)
      .expect(200);
  });

  it(`GET /consumer/auth/google/callback returns expired_state for missing state record`, async () => {
    const initialFlag = envs.CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK;

    envs.CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK = false;
    const strictRes = await request(app.getHttpServer())
      .get(`/consumer/auth/google/callback`)
      .query({ code: `oauth-code`, state: `missing-state-record` })
      .expect(302);
    expect(strictRes.headers.location).toContain(`error=expired_state`);

    envs.CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK = true;
    const compatRes = await request(app.getHttpServer())
      .get(`/consumer/auth/google/callback`)
      .query({ code: `oauth-code`, state: `missing-state-record` })
      .expect(302);
    expect(compatRes.headers.location).toContain(`error=expired_state`);

    envs.CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK = initialFlag;
  });
});
