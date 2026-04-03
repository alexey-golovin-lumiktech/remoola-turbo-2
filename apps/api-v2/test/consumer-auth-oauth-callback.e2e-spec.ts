/**
 * E2E OAuth callback contract tests for missing/expired state behavior.
 * Uses an isolated temporary DB per run via @remoola/test-db/environment.
 */
/** @jest-environment @remoola/test-db/environment */

import { createHmac } from 'crypto';

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { assertIsolatedTestDatabaseUrl } from './test-db-safety';
import { AppModule } from '../src/app.module';
import { envs } from '../src/envs';
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

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(`api`);
    app.use(cookieParser(envs.SECURE_SESSION_SECRET));
    await app.init();
  });

  afterAll(async () => {
    envs.CONSUMER_CSS_GRID_APP_ORIGIN = initialConsumerCssGridOrigin;
    await app.close();
  });

  it(`GET /api/consumer/auth/google/callback returns expired_state for missing state record`, async () => {
    const initialFlag = envs.CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK;

    try {
      envs.CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK = false;
      const strictRes = await request(app.getHttpServer())
        .get(`/api/consumer/auth/google/callback`)
        .set(`origin`, consumerOrigin)
        .query({ code: `oauth-code`, state: `missing-state-record` })
        .expect(302);
      expect(strictRes.headers.location).toContain(`error=expired_state`);

      envs.CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK = true;
      const compatRes = await request(app.getHttpServer())
        .get(`/api/consumer/auth/google/callback`)
        .set(`origin`, consumerOrigin)
        .query({ code: `oauth-code`, state: `missing-state-record` })
        .expect(302);
      expect(compatRes.headers.location).toContain(`error=expired_state`);
    } finally {
      envs.CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK = initialFlag;
    }
  });

  it(`accepts matching signed state cookie and resolves to expired_state when state record is missing`, async () => {
    const initialFlag = envs.CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK;
    const signedState = `signed-state-match`;

    try {
      envs.CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK = false;
      const res = await request(app.getHttpServer())
        .get(`/api/consumer/auth/google/callback`)
        .set(`origin`, consumerOrigin)
        .set(`Cookie`, [buildSignedStateCookie(signedState)])
        .query({ code: `oauth-code`, state: signedState })
        .expect(302);

      expect(res.headers.location).toContain(`error=expired_state`);
      expect(res.headers.location).not.toContain(`error=invalid_state`);
    } finally {
      envs.CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK = initialFlag;
    }
  });

  it(`rejects tampered signed state cookie as invalid_state outside local env fallback`, async () => {
    const initialFlag = envs.CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK;
    const initialNodeEnv = envs.NODE_ENV;
    const requestState = `signed-state-expected`;
    const tamperedCookieState = `signed-state-tampered`;

    try {
      envs.CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK = false;
      envs.NODE_ENV = envs.ENVIRONMENT.PRODUCTION;
      const res = await request(app.getHttpServer())
        .get(`/api/consumer/auth/google/callback`)
        .set(`origin`, consumerOrigin)
        .set(`Cookie`, [buildSignedStateCookie(tamperedCookieState)])
        .query({ code: `oauth-code`, state: requestState })
        .expect(302);

      expect(res.headers.location).toContain(`error=invalid_state`);
    } finally {
      envs.CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK = initialFlag;
      envs.NODE_ENV = initialNodeEnv;
    }
  });
});
