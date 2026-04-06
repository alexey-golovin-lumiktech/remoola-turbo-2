import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import {
  getScopedConsumerCsrfTokenCookieKey,
  getScopedConsumerCsrfTokenCookieKeysForRead,
  getScopedConsumerGoogleOAuthStateCookieKey,
  getScopedConsumerRefreshTokenCookieKeysForRead,
} from '@remoola/api-types';

import { ConsumerAuthController } from './auth.controller';
import { type ConsumerAuthService } from './auth.service';
import { type GoogleOAuthService } from './google-oauth.service';
import { type OAuthStateStoreService } from './oauth-state-store.service';
import { envs } from '../../envs';
import { type OriginResolverService } from '../../shared/origin-resolver.service';
import { CSRF_TOKEN_COOKIE_KEY, GOOGLE_OAUTH_STATE_COOKIE_KEY } from '../../shared-common';

describe(`ConsumerAuthController CSRF and decorator contracts`, () => {
  let controller: ConsumerAuthController;
  let service: Partial<ConsumerAuthService>;
  let initialOauthStateCookieFallback: boolean;
  let initialNodeEnv: typeof envs.NODE_ENV;

  const originResolver: Pick<
    OriginResolverService,
    | `validateConsumerAppScope`
    | `validateConsumerRedirectOrigin`
    | `resolveConsumerOriginByScope`
    | `resolveDefaultConsumerOrigin`
    | `getAllowedOrigins`
    | `resolveConsumerAppScope`
    | `resolveConsumerRequestScope`
    | `requestMatchesConsumerScope`
  > = {
    validateConsumerAppScope: jest.fn((value?: string | null) =>
      value === `consumer` || value === `consumer-mobile` || value === `consumer-css-grid` ? value : undefined,
    ),
    validateConsumerRedirectOrigin: jest.fn((value?: string) =>
      typeof value === `string` &&
      (value.includes(`app.example.com`) || value.includes(`mobile.example.com`) || value.includes(`grid.example.com`))
        ? new URL(value).origin
        : undefined,
    ),
    resolveConsumerOriginByScope: jest.fn((scope: string) => {
      if (scope === `consumer-mobile`) return `https://mobile.example.com`;
      if (scope === `consumer-css-grid`) return `https://grid.example.com`;
      if (scope === `consumer`) return `https://app.example.com`;
      return null;
    }),
    resolveDefaultConsumerOrigin: jest.fn().mockReturnValue(`https://app.example.com`),
    getAllowedOrigins: jest
      .fn()
      .mockReturnValue(new Set([`https://app.example.com`, `https://mobile.example.com`, `https://grid.example.com`])),
    resolveConsumerRequestScope: jest.fn((origin?: string | string[], referer?: string | string[]) => {
      const values = [origin, referer].flatMap((entry) => (Array.isArray(entry) ? entry : [entry]));
      for (const entry of values) {
        if (typeof entry !== `string`) continue;
        if (entry.includes(`mobile.example.com`)) return `consumer-mobile`;
        if (entry.includes(`grid.example.com`)) return `consumer-css-grid`;
        if (entry.includes(`app.example.com`)) return `consumer`;
      }
      return undefined;
    }),
    resolveConsumerAppScope: jest.fn((origin?: string) => {
      if (origin?.includes(`mobile.example.com`)) return `consumer-mobile`;
      if (origin?.includes(`grid.example.com`)) return `consumer-css-grid`;
      if (origin?.includes(`app.example.com`)) return `consumer`;
      return undefined;
    }),
    requestMatchesConsumerScope: jest.fn(
      (claimedScope?: string | null, origin?: string | string[], referer?: string | string[]) => {
        const values = [origin, referer].flatMap((entry) => (Array.isArray(entry) ? entry : [entry]));
        for (const entry of values) {
          if (typeof entry !== `string`) continue;
          if (entry.includes(`mobile.example.com`)) return claimedScope === `consumer-mobile`;
          if (entry.includes(`grid.example.com`)) return claimedScope === `consumer-css-grid`;
          if (entry.includes(`app.example.com`)) return claimedScope === `consumer`;
        }
        return false;
      },
    ),
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
      issueTokensForConsumer: jest.fn(),
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
        appScope: payload.appScope ?? `consumer`,
      })) as any),
      validateGoogleSignupPayload: jest.fn((payload) => payload),
      requestPasswordReset: jest.fn().mockResolvedValue(undefined),
      validateForgotPasswordTokenAndRedirect: jest.fn().mockResolvedValue(undefined),
      resetPasswordWithToken: jest.fn().mockResolvedValue(undefined),
      completeProfileCreationAndSendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      signupVerification: jest.fn().mockResolvedValue(undefined),
      signup: jest.fn(),
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
      cookies: { [CSRF_TOKEN_COOKIE_KEY]: `cookie-token` },
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
      cookies: { [CSRF_TOKEN_COOKIE_KEY]: `csrf-token` },
    });

    await expect(controller.logout(req, makeRes())).rejects.toBeInstanceOf(UnauthorizedException);
    expect(service.revokeSessionByRefreshTokenAndAudit).not.toHaveBeenCalled();
  });

  it(`accepts referer as CSRF origin fallback`, async () => {
    const consumerCsrfCookieKey = getScopedConsumerCsrfTokenCookieKey(`consumer`, {
      isProduction: false,
      isVercel: false,
      cookieSecure: false,
      isSecureRequest: false,
    });
    const req = makeReq({
      headers: {
        referer: `https://app.example.com/dashboard`,
        'x-csrf-token': `csrf-token`,
      },
      cookies: { [consumerCsrfCookieKey]: `csrf-token` },
    });

    await controller.logout(req, makeRes());

    expect(originResolver.resolveConsumerRequestScope).toHaveBeenCalledWith(
      undefined,
      `https://app.example.com/dashboard`,
    );
    expect(service.revokeSessionByRefreshTokenAndAudit).toHaveBeenCalled();
  });

  it(`google callback rejects when state cookie is missing`, async () => {
    const req = makeReq({ cookies: {} });
    const res = makeRes();
    (oauthStateStore.consume as jest.Mock).mockResolvedValue(undefined);
    await controller.googleOAuthCallback(req, res, `oauth-code`, `state-token`, undefined);
    expect(oauthStateStore.consume).toHaveBeenCalledWith(`state-token`);
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining(`error=expired_state`));
  });

  it(`google callback preserves app scope for access_denied`, async () => {
    const req = makeReq({ cookies: { [GOOGLE_OAUTH_STATE_COOKIE_KEY]: `state-token` } });
    const res = makeRes();
    (oauthStateStore.consume as jest.Mock).mockResolvedValueOnce({
      createdAt: Date.now(),
      codeVerifier: `verifier`,
      nonce: `nonce`,
      nextPath: `/dashboard`,
      appScope: `consumer`,
    });

    await controller.googleOAuthCallback(req, res, undefined, `state-token`, `access_denied`);

    expect(originResolver.resolveConsumerOriginByScope).toHaveBeenCalledWith(`consumer`);
    expect(res.redirect).toHaveBeenCalledWith(`https://app.example.com/login?oauth=google&error=access_denied`);
  });

  it(`google callback routes mobile callbacks by stored app scope`, async () => {
    const mobileOauthCookieKey = getScopedConsumerGoogleOAuthStateCookieKey(`consumer-mobile`, {
      isProduction: false,
      isVercel: false,
      cookieSecure: false,
      isSecureRequest: false,
    });
    const req = makeReq({ cookies: { [GOOGLE_OAUTH_STATE_COOKIE_KEY]: `state-token` } });
    const res = makeRes();
    (oauthStateStore.consume as jest.Mock).mockResolvedValueOnce({
      createdAt: Date.now(),
      codeVerifier: `verifier`,
      nonce: `nonce`,
      nextPath: `/dashboard`,
      appScope: `consumer-mobile`,
    });

    await controller.googleOAuthCallback(req, res, undefined, `state-token`, `access_denied`);

    expect(originResolver.resolveConsumerOriginByScope).toHaveBeenCalledWith(`consumer-mobile`);
    expect(res.clearCookie).toHaveBeenCalledWith(mobileOauthCookieKey, expect.any(Object));
    expect(res.redirect).toHaveBeenCalledWith(`https://mobile.example.com/login?oauth=google&error=access_denied`);
  });

  it(`google callback rejects when state cookie does not match state`, async () => {
    const req = makeReq({ cookies: { [GOOGLE_OAUTH_STATE_COOKIE_KEY]: `different-state` } });
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
      appScope: `consumer`,
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

  it(`google callback redirects back to frontend callback without setting api auth cookies`, async () => {
    (oauthStateStore.consume as jest.Mock).mockResolvedValue({
      createdAt: Date.now(),
      codeVerifier: `verifier`,
      nonce: `nonce`,
      nextPath: `/dashboard`,
      accountType: null,
      contractorKind: null,
      appScope: `consumer`,
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
    const req = makeReq({ cookies: { [GOOGLE_OAUTH_STATE_COOKIE_KEY]: `state-token` } });
    const res = makeRes();

    await controller.googleOAuthCallback(req, res, `oauth-code`, `state-token`, undefined);

    expect(service.issueTokensForConsumer).not.toHaveBeenCalled();
    expect(res.cookie).not.toHaveBeenCalled();
    expect(oauthStateStore.saveLoginHandoff).toHaveBeenCalledWith(
      `handoff-token`,
      expect.objectContaining({ identityId: `consumer-id`, nextPath: `/dashboard`, appScope: `consumer` }),
      expect.any(Number),
    );
    expect(res.redirect).toHaveBeenCalledWith(
      `https://app.example.com/auth/callback?next=%2Fdashboard&oauthHandoff=handoff-token`,
    );
  });

  it(`google callback normalizes signup next paths to dashboard for existing consumers`, async () => {
    (oauthStateStore.consume as jest.Mock).mockResolvedValue({
      createdAt: Date.now(),
      codeVerifier: `verifier`,
      nonce: `nonce`,
      nextPath: `/signup?accountType=BUSINESS`,
      accountType: `BUSINESS`,
      contractorKind: null,
      appScope: `consumer`,
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
    const req = makeReq({ cookies: { [GOOGLE_OAUTH_STATE_COOKIE_KEY]: `state-token` } });
    const res = makeRes();

    await controller.googleOAuthCallback(req, res, `oauth-code`, `state-token`, undefined);

    expect(res.redirect).toHaveBeenCalledWith(
      `https://app.example.com/auth/callback?next=%2Fdashboard&oauthHandoff=handoff-token`,
    );
  });

  it(`google callback returns unregistered consumers to signup when next pathname is signup`, async () => {
    (oauthStateStore.consume as jest.Mock).mockResolvedValue({
      createdAt: Date.now(),
      codeVerifier: `verifier`,
      nonce: `nonce`,
      nextPath: `/signup?accountType=CONTRACTOR&contractorKind=ENTITY`,
      accountType: `CONTRACTOR`,
      contractorKind: `ENTITY`,
      appScope: `consumer`,
    });
    (googleOAuthService.exchangeCodeForPayload as jest.Mock | undefined)?.mockResolvedValue({
      email: `new-user@example.com`,
      email_verified: true,
      sub: `sub`,
    });
    (service.findConsumerByEmail as jest.Mock | undefined)?.mockResolvedValue(null);
    const req = makeReq({ cookies: { [GOOGLE_OAUTH_STATE_COOKIE_KEY]: `state-token` } });
    const res = makeRes();

    await controller.googleOAuthCallback(req, res, `oauth-code`, `state-token`, undefined);

    expect(oauthStateStore.saveSignupHandoff).toHaveBeenCalledWith(
      `handoff-token`,
      expect.objectContaining({
        email: `new-user@example.com`,
        accountType: `CONTRACTOR`,
        contractorKind: `ENTITY`,
        appScope: `consumer`,
      }),
      expect.any(Number),
    );
    expect(res.redirect).toHaveBeenCalledWith(
      `https://app.example.com/signup?googleSignupHandoff=handoff-token&accountType=CONTRACTOR&contractorKind=ENTITY`,
    );
  });

  it(`google callback returns unregistered consumers to signup start for non-signup next paths`, async () => {
    (oauthStateStore.consume as jest.Mock).mockResolvedValue({
      createdAt: Date.now(),
      codeVerifier: `verifier`,
      nonce: `nonce`,
      nextPath: `/dashboard`,
      accountType: `BUSINESS`,
      contractorKind: null,
      appScope: `consumer`,
    });
    (googleOAuthService.exchangeCodeForPayload as jest.Mock | undefined)?.mockResolvedValue({
      email: `new-user@example.com`,
      email_verified: true,
      sub: `sub`,
    });
    (service.findConsumerByEmail as jest.Mock | undefined)?.mockResolvedValue(null);
    const req = makeReq({ cookies: { [GOOGLE_OAUTH_STATE_COOKIE_KEY]: `state-token` } });
    const res = makeRes();

    await controller.googleOAuthCallback(req, res, `oauth-code`, `state-token`, undefined);

    expect(res.redirect).toHaveBeenCalledWith(
      `https://app.example.com/signup/start?googleSignupHandoff=handoff-token&accountType=BUSINESS`,
    );
  });

  it.each([
    [
      `consumer-mobile`,
      `https://mobile.example.com/signup/start?googleSignupHandoff=handoff-token&accountType=BUSINESS`,
    ],
    [
      `consumer-css-grid`,
      `https://grid.example.com/signup/start?googleSignupHandoff=handoff-token&accountType=BUSINESS`,
    ],
  ] as const)(`google callback preserves %s signup handoff routing`, async (appScope, expectedRedirect) => {
    (oauthStateStore.consume as jest.Mock).mockResolvedValue({
      createdAt: Date.now(),
      codeVerifier: `verifier`,
      nonce: `nonce`,
      nextPath: `/dashboard`,
      accountType: `BUSINESS`,
      contractorKind: null,
      appScope,
    });
    (googleOAuthService.exchangeCodeForPayload as jest.Mock | undefined)?.mockResolvedValue({
      email: `new-user@example.com`,
      email_verified: true,
      sub: `sub`,
    });
    (service.findConsumerByEmail as jest.Mock | undefined)?.mockResolvedValue(null);
    const req = makeReq({ cookies: { [GOOGLE_OAUTH_STATE_COOKIE_KEY]: `state-token` } });
    const res = makeRes();

    await controller.googleOAuthCallback(req, res, `oauth-code`, `state-token`, undefined);

    expect(oauthStateStore.saveSignupHandoff).toHaveBeenCalledWith(
      `handoff-token`,
      expect.objectContaining({ email: `new-user@example.com`, appScope }),
      expect.any(Number),
    );
    expect(res.redirect).toHaveBeenCalledWith(expectedRedirect);
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

  it(`google start requires app scope and stores it in state`, async () => {
    const req = makeReq({
      headers: { referer: `https://app.example.com/settings/profile` },
    });
    const res = makeRes();

    await controller.googleOAuthStart(req, res, `consumer`, undefined, undefined, undefined, undefined);

    expect(originResolver.requestMatchesConsumerScope).toHaveBeenCalledWith(
      `consumer`,
      undefined,
      `https://app.example.com/settings/profile`,
    );
    expect(oauthStateStore.save).toHaveBeenCalledWith(
      `state-token`,
      expect.objectContaining({ appScope: `consumer` }),
      expect.any(Number),
    );
    expect(res.redirect).toHaveBeenCalledWith(`https://accounts.google.com/o/oauth2/v2/auth`);
  });

  it(`google start uses css-grid app scope for cookie and state`, async () => {
    const cssGridOauthCookieKey = getScopedConsumerGoogleOAuthStateCookieKey(`consumer-css-grid`, {
      isProduction: false,
      isVercel: false,
      cookieSecure: false,
      isSecureRequest: false,
    });
    const req = makeReq({
      headers: { origin: `https://grid.example.com` },
    });
    const res = makeRes();

    await controller.googleOAuthStart(req, res, `consumer-css-grid`, `/dashboard`, undefined, undefined, undefined);

    expect(originResolver.requestMatchesConsumerScope).toHaveBeenCalledWith(
      `consumer-css-grid`,
      `https://grid.example.com`,
      undefined,
    );
    expect(oauthStateStore.save).toHaveBeenCalledWith(
      `state-token`,
      expect.objectContaining({ appScope: `consumer-css-grid` }),
      expect.any(Number),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      cssGridOauthCookieKey,
      `state-token`,
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it(`google start sets the mobile-scoped oauth state cookie for a mobile app scope`, async () => {
    const mobileOauthCookieKey = getScopedConsumerGoogleOAuthStateCookieKey(`consumer-mobile`, {
      isProduction: false,
      isVercel: false,
      cookieSecure: false,
      isSecureRequest: false,
    });
    const req = makeReq({
      headers: { referer: `https://mobile.example.com/login` },
    });
    const res = makeRes();

    await controller.googleOAuthStart(req, res, `consumer-mobile`, undefined, undefined, undefined, undefined);

    expect(res.cookie).toHaveBeenCalledWith(
      mobileOauthCookieKey,
      `state-token`,
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it(`refresh reads mobile refresh/csrf cookies and rotates mobile auth cookies`, async () => {
    const [mobileRefreshCookieKey] = getScopedConsumerRefreshTokenCookieKeysForRead(`consumer-mobile`);
    const [mobileCsrfCookieKey] = getScopedConsumerCsrfTokenCookieKeysForRead(`consumer-mobile`);
    const req = makeReq({
      headers: {
        origin: `https://mobile.example.com`,
        'x-csrf-token': `csrf-token`,
      },
      cookies: {
        [mobileRefreshCookieKey]: `mobile-refresh-token`,
        [mobileCsrfCookieKey]: `csrf-token`,
      },
    });
    const res = makeRes();

    await controller.refreshAccess(req, res);

    expect(service.refreshAccess).toHaveBeenCalledWith(`mobile-refresh-token`, expect.any(Object));
    expect(res.cookie).toHaveBeenCalledWith(
      expect.stringMatching(/consumer_mobile_access_token/),
      `a`,
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      expect.stringMatching(/consumer_mobile_refresh_token/),
      `r`,
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      expect.stringMatching(/consumer_mobile_csrf_token/),
      expect.any(String),
      expect.objectContaining({ httpOnly: false }),
    );
  });

  it(`google start preserves normalized signup next paths without a separate signup entry field`, async () => {
    const req = makeReq();
    const res = makeRes();

    (originResolver.requestMatchesConsumerScope as jest.Mock).mockReturnValueOnce(true);
    await controller.googleOAuthStart(
      req,
      res,
      `consumer`,
      `/signup?accountType=BUSINESS`,
      undefined,
      `BUSINESS`,
      undefined,
    );

    const savedRecord = (oauthStateStore.save as jest.Mock).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(savedRecord).toMatchObject({
      nextPath: `/signup?accountType=BUSINESS`,
      appScope: `consumer`,
      signupEntryPath: `/signup`,
      accountType: `BUSINESS`,
    });
  });

  it(`google start rejects request scope mismatch for claimed app scope`, async () => {
    const req = makeReq({
      headers: { referer: `https://app.example.com/login` },
    });
    const res = makeRes();

    await expect(
      controller.googleOAuthStart(req, res, `consumer-mobile`, undefined, undefined, undefined, undefined),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(oauthStateStore.save).not.toHaveBeenCalled();
  });

  it(`completeProfileCreation sends verification using canonical mobile app scope`, async () => {
    const req = makeReq({
      headers: {
        referer: `https://mobile.example.com/signup/start`,
      },
    });

    const result = controller.completeProfileCreation(req, `consumer-id`);

    expect(originResolver.resolveConsumerRequestScope).toHaveBeenCalledWith(
      undefined,
      `https://mobile.example.com/signup/start`,
    );
    expect(service.completeProfileCreationAndSendVerificationEmail).toHaveBeenCalledWith(
      `consumer-id`,
      `consumer-mobile`,
    );
    expect(result).toBe(`success`);
  });

  it(`forgot password derives trusted app scope from referer when origin header is absent`, async () => {
    const req = makeReq({
      headers: { referer: `https://app.example.com/login` },
    });

    const result = await controller.forgotPassword(req, { email: `user@example.com` } as any);

    expect(originResolver.resolveConsumerRequestScope).toHaveBeenCalledWith(undefined, `https://app.example.com/login`);
    expect(service.requestPasswordReset).toHaveBeenCalledWith(`user@example.com`, `consumer`);
    expect(result).toEqual({
      message: `If an account exists, we sent recovery instructions.`,
      recoveryMode: `provider_aware`,
    });
  });

  it(`forgot password verify delegates token-only contract to service`, async () => {
    const res = makeRes();

    await controller.forgotPasswordVerify(`reset-token`, res);

    expect(service.validateForgotPasswordTokenAndRedirect).toHaveBeenCalledWith(`reset-token`, res);
  });

  it(`signup verification delegates token-only contract to service`, async () => {
    const res = makeRes();

    await controller.signupVerification(`signup-token`, res);

    expect(service.signupVerification).toHaveBeenCalledWith(`signup-token`, res);
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
      appScope: `consumer`,
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

  it(`resetPassword propagates BadRequestException from service`, async () => {
    (service.resetPasswordWithToken as jest.Mock).mockRejectedValueOnce(
      new BadRequestException(`INVALID_CHANGE_PASSWORD_TOKEN`),
    );
    const body = { token: `bad-token`, password: `newPassword8` };

    await expect(controller.resetPassword(body)).rejects.toThrow(BadRequestException);
  });
});
