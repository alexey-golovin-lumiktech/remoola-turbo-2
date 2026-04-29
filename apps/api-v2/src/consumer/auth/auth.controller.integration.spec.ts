import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';

import { CONSUMER_APP_SCOPE_HEADER } from '@remoola/api-types';

import { ConsumerAuthController } from './auth.controller';
import { ConsumerAuthService } from './auth.service';
import { ConsumerAuthControllerSupportService } from './consumer-auth-controller-support.service';
import { GoogleOAuthService } from './google-oauth.service';
import { OAuthStateStoreService } from './oauth-state-store.service';
import { bootstrapApiTestApp } from '../../../test/helpers/bootstrap-api-test-app';
import { extractMessage } from '../../../test/helpers/http-test-helpers';
import { OriginResolverService } from '../../shared/origin-resolver.service';

describe(`ConsumerAuthController integration`, () => {
  let app: INestApplication;
  let close: (() => Promise<void>) | undefined;

  const service = {
    issueTokensForConsumer: jest.fn(),
  };

  const originResolver = {
    validateConsumerAppScope: jest.fn((value?: string | null) =>
      value === `consumer` || value === `consumer-mobile` || value === `consumer-css-grid` ? value : undefined,
    ),
    validateConsumerAppScopeHeader: jest.fn((value?: string | string[]) => {
      const headerValue = Array.isArray(value) ? value[0] : value;
      return headerValue === `consumer` || headerValue === `consumer-mobile` || headerValue === `consumer-css-grid`
        ? headerValue
        : undefined;
    }),
    resolveConsumerOriginByScope: jest.fn((scope: string) => {
      if (scope === `consumer-mobile`) return `https://mobile.example.com`;
      if (scope === `consumer-css-grid`) return `https://grid.example.com`;
      if (scope === `consumer`) return `https://app.example.com`;
      return null;
    }),
    getAllowedOrigins: jest
      .fn()
      .mockReturnValue(new Set([`https://app.example.com`, `https://mobile.example.com`, `https://grid.example.com`])),
    getConsumerAllowedOrigins: jest
      .fn()
      .mockReturnValue(new Set([`https://app.example.com`, `https://mobile.example.com`, `https://grid.example.com`])),
    normalizeOrigin: jest.fn((value: string) => value),
  };

  const oauthStateStore = {
    read: jest.fn(),
    consume: jest.fn(),
    createStateToken: jest.fn().mockReturnValue(`state-token`),
    createEphemeralToken: jest.fn().mockReturnValue(`handoff-token`),
    save: jest.fn(),
    saveLoginHandoff: jest.fn(),
    saveSignupHandoff: jest.fn(),
    consumeLoginHandoff: jest.fn(),
    consumeSignupHandoff: jest.fn(),
    saveSignupSession: jest.fn(),
    readSignupSession: jest.fn(),
  };

  const googleOAuthService = {
    buildAuthorizationUrl: jest.fn().mockReturnValue(`https://accounts.google.com/o/oauth2/v2/auth`),
    exchangeCodeForPayload: jest.fn(),
    loginWithPayload: jest.fn(),
  };

  beforeAll(async () => {
    const harness = await bootstrapApiTestApp({
      controllers: [ConsumerAuthController],
      providers: [
        ConsumerAuthControllerSupportService,
        { provide: ConsumerAuthService, useValue: service },
        { provide: GoogleOAuthService, useValue: googleOAuthService },
        { provide: OAuthStateStoreService, useValue: oauthStateStore },
        { provide: OriginResolverService, useValue: originResolver },
      ],
      preset: `validationOnly`,
      cookieSecret: `test-secret`,
    });

    app = harness.app;
    close = harness.close;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (close) {
      await close();
    }
  });

  it(`POST /api/consumer/auth/oauth/complete validates handoffToken as a string body field`, async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/consumer/auth/oauth/complete?appScope=consumer-css-grid`)
      .set(CONSUMER_APP_SCOPE_HEADER, `consumer-css-grid`)
      .send({
        handoffToken: 123,
      })
      .expect(400);

    expect(service.issueTokensForConsumer).not.toHaveBeenCalled();
    expect(extractMessage(res.body)).toContain(`handoffToken`);
  });
});
