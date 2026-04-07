/**
 * E2E OAuth callback contract tests for missing/expired state behavior.
 * Uses an isolated temporary DB per run via @remoola/test-db/environment.
 */
/** @jest-environment @remoola/test-db/environment */

import { createHmac } from 'crypto';

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { assertIsolatedTestDatabaseUrl } from './test-db-safety';
import { AppModule } from '../src/app.module';
import { envs } from '../src/envs';
import { configureApp } from '../src/main';
import { getApiOAuthStateCookieKeysForRead } from '../src/shared-common';

describe(`Consumer auth OAuth callback contracts (e2e, isolated DB)`, () => {
  let app: INestApplication;
  const consumerOrigin = `http://127.0.0.1:3003`;
  let initialConsumerCssGridOrigin: string;

  function signCookieValue(value: string, secret: string): string {
    const digest = createHmac(`sha256`, secret).update(value).digest(`base64`).replace(/=+$/, ``);
    return `s:${value}.${digest}`;
  }

  function buildSignedStateCookie(state: string): string {
    const secret = envs.SECURE_SESSION_SECRET;
    const cookieKey = getApiOAuthStateCookieKeysForRead(`consumer-css-grid`)[0];
    return `${cookieKey}=${encodeURIComponent(signCookieValue(state, secret))}`;
  }

  beforeAll(async () => {
    assertIsolatedTestDatabaseUrl();
    initialConsumerCssGridOrigin = envs.CONSUMER_CSS_GRID_APP_ORIGIN;
    envs.CONSUMER_CSS_GRID_APP_ORIGIN = consumerOrigin;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    envs.CONSUMER_CSS_GRID_APP_ORIGIN = initialConsumerCssGridOrigin;
    await app.close();
  });

  it(`GET /api/consumer/auth/google/callback returns expired_state for missing state record`, async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/consumer/auth/google/callback`)
      .set(`origin`, consumerOrigin)
      .query({ code: `oauth-code`, state: `missing-state-record` })
      .expect(400);

    expect(res.body?.message).toBe(`Invalid OAuth state`);
  });

  it(`returns invalid_state even with a matching signed cookie when the state record is missing`, async () => {
    const signedState = `signed-state-match`;
    const res = await request(app.getHttpServer())
      .get(`/api/consumer/auth/google/callback`)
      .set(`origin`, consumerOrigin)
      .set(`Cookie`, [buildSignedStateCookie(signedState)])
      .query({ code: `oauth-code`, state: signedState })
      .expect(400);

    expect(res.body?.message).toBe(`Invalid OAuth state`);
  });

  it(`returns invalid_state for a tampered signed cookie when no state record exists`, async () => {
    const initialNodeEnv = envs.NODE_ENV;
    const requestState = `signed-state-expected`;
    const tamperedCookieState = `signed-state-tampered`;

    try {
      envs.NODE_ENV = envs.ENVIRONMENT.PRODUCTION;
      const res = await request(app.getHttpServer())
        .get(`/api/consumer/auth/google/callback`)
        .set(`origin`, consumerOrigin)
        .set(`Cookie`, [buildSignedStateCookie(tamperedCookieState)])
        .query({ code: `oauth-code`, state: requestState })
        .expect(400);

      expect(res.body?.message).toBe(`Invalid OAuth state`);
    } finally {
      envs.NODE_ENV = initialNodeEnv;
    }
  });
});
