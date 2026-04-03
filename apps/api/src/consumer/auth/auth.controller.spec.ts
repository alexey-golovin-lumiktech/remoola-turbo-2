import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import { ConsumerAuthController } from './auth.controller';
import { type ConsumerAuthService } from './auth.service';
import { type GoogleOAuthService } from './google-oauth.service';
import { type OAuthStateStoreService } from './oauth-state-store.service';
import { envs } from '../../envs';
import { type OriginResolverService } from '../../shared/origin-resolver.service';
import { getApiOAuthStateCookieKeysForRead } from '../../shared-common';

describe(`ConsumerAuthController CSRF and decorator contracts`, () => {
  let controller: ConsumerAuthController;
  let service: Partial<ConsumerAuthService>;
  let initialOauthStateCookieFallback: boolean;
  let initialNodeEnv: typeof envs.NODE_ENV;
  const consumerOrigin = `https://app.example.com`;
  const consumerMobileOrigin = `https://mobile.example.com`;

  const resolveMockOrigin = (origin?: string | string[], referer?: string | string[]) => {
    const values = [origin, referer].flatMap((entry) => (Array.isArray(entry) ? entry : [entry]));
    if (values.some((entry) => typeof entry === `string` && entry.includes(`mobile.example.com`))) {
      return consumerMobileOrigin;
    }
    if (values.some((entry) => typeof entry === `string` && entry.includes(`app.example.com`))) {
      return consumerOrigin;
    }
    return undefined;
  };

  const originResolver: Pick<
    OriginResolverService,
    | `validateConsumerRedirectOrigin`
    | `resolveConsumerOriginByScope`
    | `resolveDefaultConsumerOrigin`
    | `resolveConsumerAppScope`
    | `resolveConsumerRequestScope`
  > = {
    validateConsumerRedirectOrigin: jest.fn((value?: string) =>
      typeof value === `string` && (value.includes(`app.example.com`) || value.includes(`mobile.example.com`))
        ? new URL(value).origin
        : undefined,
    ),
    resolveConsumerOriginByScope: jest.fn((scope: string) => {
      if (scope === `consumer-mobile`) return consumerMobileOrigin;
      if (scope === `consumer`) return consumerOrigin;
      return null;
    }),
    resolveDefaultConsumerOrigin: jest.fn().mockReturnValue(consumerOrigin),
    resolveConsumerAppScope: jest.fn((origin?: string) => {
      if (origin?.includes(`mobile.example.com`)) return `consumer-mobile`;
      if (origin?.includes(`app.example.com`)) return `consumer`;
      return undefined;
    }),
    resolveConsumerRequestScope: jest.fn((origin?: string | string[], referer?: string | string[]) => {
      const resolvedOrigin = resolveMockOrigin(origin, referer);
      if (resolvedOrigin === consumerMobileOrigin) return `consumer-mobile`;
      if (resolvedOrigin === consumerOrigin) return `consumer`;
      return undefined;
    }),
  };

  const oauthStateStore: Pick<
    OAuthStateStoreService,
    | `createStateToken`
    | `createEphemeralToken`
    | `save`
    | `consume`
    | `saveLoginHandoff`
    | `saveSignupHandoff`
    | `consumeLoginHandoff`
    | `consumeSignupHandoff`
    | `saveSignupSession`
    | `readSignupSession`
  > = {
    createStateToken: jest.fn().mockReturnValue(`state-token`),
    createEphemeralToken: jest.fn().mockReturnValue(`handoff-token`),
    save: jest.fn(),
    consume: jest.fn(),
    saveLoginHandoff: jest.fn(),
    saveSignupHandoff: jest.fn(),
    consumeLoginHandoff: jest.fn(),
    consumeSignupHandoff: jest.fn(),
    saveSignupSession: jest.fn(),
    readSignupSession: jest.fn(),
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
      createGoogleSignupPayload: jest.fn(((payload) => ({
        type: `google_signup`,
        email: payload.email ?? ``,
        emailVerified: payload.emailVerified ?? true,
        name: payload.name ?? null,
        givenName: payload.givenName ?? null,
        familyName: payload.familyName ?? null,
        picture: payload.picture ?? null,
        organization: payload.organization ?? null,
        sub: payload.sub ?? null,
        signupEntryPath: payload.signupEntryPath ?? null,
        nextPath: payload.nextPath ?? null,
        accountType: payload.accountType ?? null,
        contractorKind: payload.contractorKind ?? null,
        redirectOrigin: payload.redirectOrigin ?? null,
      })) as any),
      validateGoogleSignupPayload: jest.fn((payload) => payload),
      issueTokensForConsumer: jest.fn(),
      completeProfileCreationAndSendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      requestPasswordReset: jest.fn().mockResolvedValue(undefined),
      signup: jest.fn(),
      resetPasswordWithToken: jest.fn().mockResolvedValue(undefined),
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

  it(`rejects logout when csrf matches but request origin is missing`, async () => {
    const req = makeReq({
      headers: { 'x-csrf-token': `csrf-token` },
      cookies: { csrf_token: `csrf-token` },
    });

    await expect(controller.logout(req, makeRes())).rejects.toBeInstanceOf(UnauthorizedException);
    expect(service.revokeSessionByRefreshTokenAndAudit).not.toHaveBeenCalled();
  });

  it(`google start stores the canonical request origin from the origin header`, async () => {
    const req = makeReq({ headers: { origin: consumerOrigin } });
    const res = makeRes();

    await controller.googleOAuthStart(req, res, `/dashboard`, undefined, undefined, undefined);

    expect(originResolver.resolveConsumerOriginByScope).toHaveBeenCalledWith(`consumer`);
    expect(oauthStateStore.save).toHaveBeenCalledWith(
      `state-token`,
      expect.objectContaining({
        nextPath: `/dashboard`,
        redirectOrigin: consumerOrigin,
      }),
      expect.any(Number),
    );
    expect(getApiOAuthStateCookieKeysForRead(`consumer`)).toContain((res.cookie as jest.Mock).mock.calls[0]?.[0]);
    expect(res.cookie).toHaveBeenCalledWith(expect.any(String), `state-token`, expect.any(Object));
  });

  it(`google start derives the mobile scope from the request referer`, async () => {
    const req = makeReq({
      headers: {
        referer: `${consumerMobileOrigin}/api/consumer/auth/google/start?next=%2Fdashboard`,
      },
    });
    const res = makeRes();

    await controller.googleOAuthStart(req, res, `/dashboard`, undefined, undefined, undefined);

    expect(originResolver.resolveConsumerOriginByScope).toHaveBeenCalledWith(`consumer-mobile`);
    expect(oauthStateStore.save).toHaveBeenCalledWith(
      `state-token`,
      expect.objectContaining({
        redirectOrigin: consumerMobileOrigin,
      }),
      expect.any(Number),
    );
    expect(getApiOAuthStateCookieKeysForRead(`consumer-mobile`)).toContain(
      (res.cookie as jest.Mock).mock.calls[0]?.[0],
    );
    expect(res.cookie).toHaveBeenCalledWith(expect.any(String), `state-token`, expect.any(Object));
  });

  it(`google start rejects when the request origin cannot be trusted`, async () => {
    const req = makeReq({ headers: {} });
    const res = makeRes();

    await expect(
      controller.googleOAuthStart(req, res, `/dashboard`, undefined, undefined, undefined),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(oauthStateStore.save).not.toHaveBeenCalled();
  });

  it(`google callback rejects when state cookie is missing`, async () => {
    const req = makeReq({ cookies: {} });
    const res = makeRes();
    (oauthStateStore.consume as jest.Mock).mockResolvedValue(undefined);
    await controller.googleOAuthCallback(req, res, `oauth-code`, `state-token`, undefined);
    expect(oauthStateStore.consume).toHaveBeenCalledWith(`state-token`);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining(`error=expired_state`));
  });

  it(`google callback preserves return origin for access_denied`, async () => {
    const req = makeReq({ cookies: { google_oauth_state: `state-token` } });
    const res = makeRes();
    (oauthStateStore.consume as jest.Mock).mockResolvedValueOnce({
      createdAt: Date.now(),
      codeVerifier: `verifier`,
      nonce: `nonce`,
      nextPath: `/dashboard`,
      redirectOrigin: `https://app.example.com`,
    });

    await controller.googleOAuthCallback(req, res, undefined, `state-token`, `access_denied`);

    expect(originResolver.resolveConsumerOriginByScope).toHaveBeenCalledWith(`consumer`);
    expect(res.redirect).toHaveBeenCalledWith(`https://app.example.com/login?oauth=google&error=access_denied`);
  });

  it(`google callback routes legacy mobile redirect origins through consumer scope`, async () => {
    const req = makeReq({ cookies: { google_oauth_state: `state-token` } });
    const res = makeRes();
    (oauthStateStore.consume as jest.Mock).mockResolvedValueOnce({
      createdAt: Date.now(),
      codeVerifier: `verifier`,
      nonce: `nonce`,
      nextPath: `/dashboard`,
      redirectOrigin: `https://mobile.example.com/login`,
    });

    await controller.googleOAuthCallback(req, res, undefined, `state-token`, `access_denied`);

    expect(originResolver.validateConsumerRedirectOrigin).toHaveBeenCalledWith(`https://mobile.example.com/login`);
    expect(originResolver.resolveConsumerAppScope).toHaveBeenCalledWith(`https://mobile.example.com`);
    expect(originResolver.resolveConsumerOriginByScope).toHaveBeenCalledWith(`consumer-mobile`);
    expect(res.redirect).toHaveBeenCalledWith(`https://mobile.example.com/login?oauth=google&error=access_denied`);
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
      redirectOrigin: `https://app.example.com`,
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
    const req = makeReq({ cookies: {} });
    const res = makeRes();
    await controller.googleOAuthCallback(req, res, `oauth-code`, `state-token`, undefined);

    expect(oauthStateStore.consume).toHaveBeenCalledWith(`state-token`);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining(`oauthHandoff=handoff-token`));
  });

  it(`google callback returns unregistered users to the recorded signup step`, async () => {
    envs.CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK = true;
    (oauthStateStore.consume as jest.Mock).mockResolvedValue({
      createdAt: Date.now(),
      codeVerifier: `verifier`,
      nonce: `nonce`,
      nextPath: `/signup?accountType=BUSINESS`,
      signupEntryPath: `/signup`,
      accountType: `BUSINESS`,
      contractorKind: null,
      redirectOrigin: `https://app.example.com`,
    });
    (googleOAuthService.exchangeCodeForPayload as jest.Mock | undefined)?.mockResolvedValue({
      email: `new@example.com`,
      email_verified: true,
      sub: `sub`,
    });
    (service.findConsumerByEmail as jest.Mock | undefined)?.mockResolvedValue(null);
    const req = makeReq({ cookies: {} });
    const res = makeRes();
    await controller.googleOAuthCallback(req, res, `oauth-code`, `state-token`, undefined);

    expect(res.redirect).toHaveBeenCalledWith(
      `https://app.example.com/signup?googleSignupHandoff=handoff-token&accountType=BUSINESS`,
    );
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

  it(`google callback accepts the consumer-mobile state cookie when callback origin headers are absent`, async () => {
    (oauthStateStore.consume as jest.Mock).mockResolvedValue({
      createdAt: Date.now(),
      codeVerifier: `verifier`,
      nonce: `nonce`,
      nextPath: `/dashboard`,
      accountType: null,
      contractorKind: null,
      redirectOrigin: `https://app.example.com`,
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

    const mobileStateCookieKey = getApiOAuthStateCookieKeysForRead(`consumer-mobile`)[0];
    const req = makeReq({
      cookies: { [mobileStateCookieKey]: `state-token` },
    });
    const res = makeRes();

    await controller.googleOAuthCallback(req, res, `oauth-code`, `state-token`, undefined);

    expect(oauthStateStore.consume).toHaveBeenCalledWith(`state-token`);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining(`oauthHandoff=handoff-token`));
  });

  it(`resetPassword delegates to service and returns success`, async () => {
    const body = { token: `reset-token`, password: `newPassword8` };
    const result = await controller.resetPassword(body);

    expect(service.resetPasswordWithToken).toHaveBeenCalledWith(`reset-token`, `newPassword8`);
    expect(result).toEqual({ success: true });
  });

  it(`signup issues cookies directly for google signup completions`, async () => {
    (oauthStateStore.readSignupSession as jest.Mock | undefined)?.mockResolvedValue({
      nextPath: `/signup?accountType=BUSINESS`,
      email: `new@example.com`,
      emailVerified: true,
      type: `google_signup`,
    });
    (service.signup as jest.Mock | undefined)?.mockResolvedValue({ id: `consumer-id` });
    (service.issueTokensForConsumer as jest.Mock | undefined)?.mockResolvedValue({
      accessToken: `access`,
      refreshToken: `refresh`,
    });

    const req = makeReq({
      headers: { origin: `https://app.example.com` },
      cookies: { consumer_google_signup_session: `signup-session-token` },
    });
    const res = makeRes();
    const result = await controller.signup(req, res, {
      email: `new@example.com`,
      accountType: `BUSINESS`,
      addressDetails: { postalCode: `1`, country: `US` } as any,
    } as any);

    expect(result).toEqual({
      consumer: { id: `consumer-id` },
      next: `/dashboard`,
    });
    expect(service.issueTokensForConsumer).toHaveBeenCalledWith(`consumer-id`);
    expect(res.cookie).toHaveBeenCalled();
  });

  it(`completeProfileCreation sends verification using canonical mobile origin`, async () => {
    const req = makeReq({
      headers: {
        referer: `${consumerMobileOrigin}/signup/start`,
      },
    });

    const result = controller.completeProfileCreation(req, `consumer-id`);

    expect(originResolver.resolveConsumerRequestScope).toHaveBeenCalledWith(
      undefined,
      `${consumerMobileOrigin}/signup/start`,
    );
    expect(originResolver.resolveConsumerOriginByScope).toHaveBeenCalledWith(`consumer-mobile`);
    expect(service.completeProfileCreationAndSendVerificationEmail).toHaveBeenCalledWith(
      `consumer-id`,
      consumerMobileOrigin,
    );
    expect(result).toBe(`success`);
  });

  it(`forgotPassword passes canonical mobile origin to the service`, async () => {
    const req = makeReq({
      headers: {
        origin: `${consumerMobileOrigin}`,
      },
    });

    const result = await controller.forgotPassword(req, { email: `user@example.com` } as any);

    expect(originResolver.resolveConsumerRequestScope).toHaveBeenCalledWith(consumerMobileOrigin, undefined);
    expect(originResolver.resolveConsumerOriginByScope).toHaveBeenCalledWith(`consumer-mobile`);
    expect(service.requestPasswordReset).toHaveBeenCalledWith(`user@example.com`, consumerMobileOrigin);
    expect(result).toEqual({ message: `If an account exists, we sent instructions.` });
  });

  it(`resetPassword propagates BadRequestException from service`, async () => {
    (service.resetPasswordWithToken as jest.Mock).mockRejectedValueOnce(
      new BadRequestException(`INVALID_CHANGE_PASSWORD_TOKEN`),
    );
    const body = { token: `bad-token`, password: `newPassword8` };

    await expect(controller.resetPassword(body)).rejects.toThrow(BadRequestException);
  });
});
