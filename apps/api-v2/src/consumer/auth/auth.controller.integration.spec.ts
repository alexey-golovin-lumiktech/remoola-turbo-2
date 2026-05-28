import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';

import { CONSUMER_APP_SCOPE_HEADER, CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';

import { ConsumerAuthService } from './auth.service';
import { ConsumerAuthControllerSupportService } from './consumer-auth-controller-support.service';
import { ConsumerGoogleOAuthFlowService } from './oauth/consumer-google-oauth-flow.service';
import { ConsumerGoogleOAuthController } from './oauth/consumer-google-oauth.controller';
import { GoogleOAuthService } from './oauth/google-oauth.service';
import { OAuthStateStoreService } from './oauth/oauth-state-store.service';
import { bootstrapApiTestApp } from '../../../test/helpers/bootstrap-api-test-app';
import { extractMessage } from '../../../test/helpers/http-test-helpers';
import { OriginResolverService } from '../../shared/origin-resolver.service';

describe(`Consumer auth controller integration`, () => {
  let app: INestApplication;
  let close: (() => Promise<void>) | undefined;

  const service = {
    issueTokensForConsumer: jest.fn<(...a: any[]) => any>(),
  };

  const originResolver = {
    validateConsumerAppScope: jest.fn<(...a: any[]) => any>((value?: string | null) =>
      value === CURRENT_CONSUMER_APP_SCOPE ? CURRENT_CONSUMER_APP_SCOPE : undefined,
    ),
    validateConsumerAppScopeHeader: jest.fn<(...a: any[]) => any>((value?: string | string[]) => {
      const headerValue = Array.isArray(value) ? value[0] : value;
      return headerValue === CURRENT_CONSUMER_APP_SCOPE ? CURRENT_CONSUMER_APP_SCOPE : undefined;
    }),
    resolveConsumerOriginByScope: jest.fn<(...a: any[]) => any>((scope: string) => {
      if (scope === CURRENT_CONSUMER_APP_SCOPE) return `https://grid.example.com`;
      return null;
    }),
    getAllowedOrigins: jest.fn<(...a: any[]) => any>().mockReturnValue(new Set([`https://grid.example.com`])),
    getConsumerAllowedOrigins: jest.fn<(...a: any[]) => any>().mockReturnValue(new Set([`https://grid.example.com`])),
    normalizeOrigin: jest.fn<(...a: any[]) => any>((value: string) => value),
  };

  const oauthStateStore = {
    read: jest.fn<(...a: any[]) => any>(),
    consume: jest.fn<(...a: any[]) => any>(),
    createStateToken: jest.fn<(...a: any[]) => any>().mockReturnValue(`state-token`),
    createEphemeralToken: jest.fn<(...a: any[]) => any>().mockReturnValue(`handoff-token`),
    save: jest.fn<(...a: any[]) => any>(),
    saveLoginHandoff: jest.fn<(...a: any[]) => any>(),
    saveSignupHandoff: jest.fn<(...a: any[]) => any>(),
    consumeLoginHandoff: jest.fn<(...a: any[]) => any>(),
    consumeSignupHandoff: jest.fn<(...a: any[]) => any>(),
    saveSignupSession: jest.fn<(...a: any[]) => any>(),
    readSignupSession: jest.fn<(...a: any[]) => any>(),
  };

  const googleOAuthService = {
    buildAuthorizationUrl: jest
      .fn<(...a: any[]) => any>()
      .mockReturnValue(`https://accounts.google.com/o/oauth2/v2/auth`),
    exchangeCodeForPayload: jest.fn<(...a: any[]) => any>(),
    loginWithPayload: jest.fn<(...a: any[]) => any>(),
  };

  beforeAll(async () => {
    const harness = await bootstrapApiTestApp({
      controllers: [ConsumerGoogleOAuthController],
      providers: [
        ConsumerAuthControllerSupportService,
        ConsumerGoogleOAuthFlowService,
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
      .post(`/api/consumer/auth/oauth/complete?appScope=${CURRENT_CONSUMER_APP_SCOPE}`)
      .set(CONSUMER_APP_SCOPE_HEADER, CURRENT_CONSUMER_APP_SCOPE)
      .send({
        handoffToken: 123,
      })
      .expect(400);

    expect(service.issueTokensForConsumer).not.toHaveBeenCalled();
    expect(extractMessage(res.body)).toContain(`handoffToken`);
  });
});
