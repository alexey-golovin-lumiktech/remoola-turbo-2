import { UnauthorizedException } from '@nestjs/common';

import { ConsumerAuthController } from './auth.controller';
import { type ConsumerAuthService } from './auth.service';
import { type GoogleOAuthService } from './google-oauth.service';
import { type OAuthStateStoreService } from './oauth-state-store.service';
import { TRACK_CONSUMER_ACTION } from '../../common/decorators/track-consumer-action.decorator';
import { envs } from '../../envs';
import { type OriginResolverService } from '../../shared/origin-resolver.service';

describe(`ConsumerAuthController CSRF and decorator contracts`, () => {
  let controller: ConsumerAuthController;
  let service: Partial<ConsumerAuthService>;
  let initialOauthStateCookieFallback: boolean;
  let initialNodeEnv: typeof envs.NODE_ENV;

  const originResolver: Pick<
    OriginResolverService,
    `validateReturnOrigin` | `resolveConsumerOrigin` | `getAllowedOrigins`
  > = {
    validateReturnOrigin: jest.fn().mockReturnValue(`https://app.example.com`),
    resolveConsumerOrigin: jest.fn().mockReturnValue(`https://app.example.com`),
    getAllowedOrigins: jest.fn().mockReturnValue(new Set([`https://app.example.com`])),
  };

  const oauthStateStore: Pick<OAuthStateStoreService, `createStateToken` | `save` | `consume`> = {
    createStateToken: jest.fn().mockReturnValue(`state-token`),
    save: jest.fn(),
    consume: jest.fn(),
  };

  const googleOAuthService: Partial<GoogleOAuthService> = {
    buildAuthorizationUrl: jest.fn().mockReturnValue(`https://accounts.google.com/o/oauth2/v2/auth`),
    exchangeCodeForPayload: jest.fn(),
    loginWithPayload: jest.fn(),
  };

  const makeReq = (
    overrides: Partial<{
      headers: Record<string, string | string[] | undefined>;
      cookies: Record<string, string | undefined>;
      ip: string;
    }> = {},
  ) =>
    ({
      headers: {},
      cookies: {},
      ip: `127.0.0.1`,
      ...overrides,
    }) as any;

  const makeRes = () =>
    ({
      clearCookie: jest.fn(),
      cookie: jest.fn(),
      redirect: jest.fn(),
    }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
    initialOauthStateCookieFallback = envs.CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK;
    initialNodeEnv = envs.NODE_ENV;
    envs.CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK = false;
    service = {
      revokeSessionByRefreshTokenAndAudit: jest.fn().mockResolvedValue(undefined),
      revokeAllSessionsByConsumerIdAndAudit: jest.fn().mockResolvedValue(undefined),
      refreshAccess: jest.fn().mockResolvedValue({ accessToken: `a`, refreshToken: `r` }),
      findConsumerByEmail: jest.fn(),
      issueTokensForConsumer: jest.fn(),
      createOAuthExchangeToken: jest.fn(),
    };

    controller = new ConsumerAuthController(
      service as ConsumerAuthService,
      googleOAuthService as GoogleOAuthService,
      oauthStateStore as OAuthStateStoreService,
      originResolver as OriginResolverService,
    );
  });

  afterEach(() => {
    envs.CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK = initialOauthStateCookieFallback;
    envs.NODE_ENV = initialNodeEnv;
  });

  it(`rejects refresh without CSRF token`, async () => {
    await expect(controller.refreshAccess(makeReq(), makeRes())).rejects.toBeInstanceOf(UnauthorizedException);
    expect(service.refreshAccess).not.toHaveBeenCalled();
  });

  it(`rejects logout when CSRF header/cookie mismatch`, async () => {
    const req = makeReq({
      headers: { 'x-csrf-token': `header-token` },
      cookies: { csrf_token: `cookie-token` },
    });
    await expect(controller.logout(req, makeRes())).rejects.toBeInstanceOf(UnauthorizedException);
    expect(service.revokeSessionByRefreshTokenAndAudit).not.toHaveBeenCalled();
  });

  it(`rejects logout-all without CSRF token`, async () => {
    await expect(
      controller.logoutAll(makeReq(), { id: `consumer-id`, email: `u@e.com`, type: `consumer` } as any, makeRes()),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(service.revokeAllSessionsByConsumerIdAndAudit).not.toHaveBeenCalled();
  });

  it(`keeps refresh-access legacy endpoint undecorated`, () => {
    const metadata = Reflect.getMetadata(TRACK_CONSUMER_ACTION, ConsumerAuthController.prototype.refreshAccessLegacy);
    expect(metadata).toBeUndefined();
  });

  it(`google callback rejects when state cookie is missing`, async () => {
    const req = makeReq({ cookies: {} });
    const res = makeRes();
    (oauthStateStore.consume as jest.Mock).mockResolvedValue(undefined);
    await controller.googleOAuthCallback(req, res, `oauth-code`, `state-token`, undefined);
    expect(oauthStateStore.consume).toHaveBeenCalledWith(`state-token`);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining(`error=expired_state`));
  });

  it(`google callback rejects when state cookie does not match state`, async () => {
    const req = makeReq({ cookies: { google_oauth_state: `different-state` } });
    const res = makeRes();
    (oauthStateStore.consume as jest.Mock).mockResolvedValue(undefined);
    await controller.googleOAuthCallback(req, res, `oauth-code`, `state-token`, undefined);
    expect(oauthStateStore.consume).toHaveBeenCalledWith(`state-token`);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining(`error=expired_state`));
  });

  it(`google callback can consume state without cookie when compatibility flag is enabled`, async () => {
    envs.CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK = true;
    (oauthStateStore.consume as jest.Mock).mockResolvedValue({
      createdAt: Date.now(),
      codeVerifier: `verifier`,
      nonce: `nonce`,
      nextPath: `/dashboard`,
      accountType: null,
      contractorKind: null,
      returnOrigin: `https://app.example.com`,
    });
    (googleOAuthService.exchangeCodeForPayload as jest.Mock | undefined)?.mockResolvedValue({
      email: `test@example.com`,
      email_verified: true,
      sub: `sub`,
    });
    (service.findConsumerByEmail as jest.Mock | undefined)?.mockResolvedValue({
      id: `consumer-id`,
      email: `test@example.com`,
    });
    (googleOAuthService.loginWithPayload as jest.Mock | undefined)?.mockResolvedValue({
      id: `consumer-id`,
    });
    (service.issueTokensForConsumer as jest.Mock | undefined)?.mockResolvedValue({
      accessToken: `access`,
      refreshToken: `refresh`,
    });
    (service.createOAuthExchangeToken as jest.Mock | undefined)?.mockResolvedValue(`exchange-token`);

    const req = makeReq({ cookies: {} });
    const res = makeRes();
    await controller.googleOAuthCallback(req, res, `oauth-code`, `state-token`, undefined);

    expect(oauthStateStore.consume).toHaveBeenCalledWith(`state-token`);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining(`oauthToken=exchange-token`));
  });

  it(`google callback blocks missing-state-cookie fallback in production`, async () => {
    envs.CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK = true;
    envs.NODE_ENV = envs.ENVIRONMENT.PRODUCTION;
    const req = makeReq({ cookies: {} });
    const res = makeRes();

    await controller.googleOAuthCallback(req, res, `oauth-code`, `state-token`, undefined);

    expect(oauthStateStore.consume).toHaveBeenCalledWith(`state-token`);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining(`error=invalid_state`));
  });

  it(`google callback blocks missing-state-cookie fallback in staging`, async () => {
    envs.CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK = true;
    envs.NODE_ENV = envs.ENVIRONMENT.STAGING;
    const req = makeReq({ cookies: {} });
    const res = makeRes();

    await controller.googleOAuthCallback(req, res, `oauth-code`, `state-token`, undefined);

    expect(oauthStateStore.consume).toHaveBeenCalledWith(`state-token`);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining(`error=invalid_state`));
  });
});
