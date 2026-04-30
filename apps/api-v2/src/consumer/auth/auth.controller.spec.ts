import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import {
  CONSUMER_APP_SCOPE_HEADER,
  CURRENT_CONSUMER_APP_SCOPE,
  getScopedConsumerCsrfTokenCookieKey,
  getScopedConsumerCsrfTokenCookieKeysForRead,
  getScopedConsumerGoogleOAuthStateCookieKey,
  getScopedConsumerRefreshTokenCookieKeysForRead,
} from '@remoola/api-types';

import { ConsumerAuthController } from './auth.controller';
import { type ConsumerAuthService } from './auth.service';
import { ConsumerAuthControllerSupportService } from './consumer-auth-controller-support.service';
import { type GoogleOAuthService } from './google-oauth.service';
import { type OAuthStateStoreService } from './oauth-state-store.service';
import { envs } from '../../envs';
import { type OriginResolverService } from '../../shared/origin-resolver.service';
import {
  CSRF_TOKEN_COOKIE_KEY,
  getApiConsumerGoogleSignupSessionCookieKey,
  GOOGLE_OAUTH_STATE_COOKIE_KEY,
} from '../../shared-common';

describe(`ConsumerAuthController CSRF and decorator contracts`, () => {
  let controller: ConsumerAuthController;
  let service: Partial<ConsumerAuthService>;
  let initialNodeEnv: typeof envs.NODE_ENV;

  const originResolver = {
    validateConsumerAppScope: jest.fn((value?: string | null) =>
      value === CURRENT_CONSUMER_APP_SCOPE ? CURRENT_CONSUMER_APP_SCOPE : undefined,
    ),
    validateConsumerAppScopeHeader: jest.fn((value?: string | string[]) => {
      const headerValue = Array.isArray(value) ? value[0] : value;
      return headerValue === CURRENT_CONSUMER_APP_SCOPE ? CURRENT_CONSUMER_APP_SCOPE : undefined;
    }),
    resolveConsumerOriginByScope: jest.fn((scope: string) => {
      if (scope === CURRENT_CONSUMER_APP_SCOPE) return `https://grid.example.com`;
      return null;
    }),
    getAllowedOrigins: jest.fn().mockReturnValue(new Set([`https://grid.example.com`])),
    getConsumerAllowedOrigins: jest.fn().mockReturnValue(new Set([`https://grid.example.com`])),
    normalizeOrigin: jest.fn((value: string) => value),
  } as unknown as OriginResolverService & Record<string, jest.Mock>;

  const oauthStateStore: Pick<
    OAuthStateStoreService,
    | `createStateToken`
    | `createEphemeralToken`
    | `save`
    | `read`
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
    read: jest.fn(),
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
  ) => {
    const headers = { ...(overrides.headers ?? {}) };

    return {
      cookies: {},
      ip: `127.0.0.1`,
      ...overrides,
      headers,
    } as any;
  };

  const makeRes = () =>
    ({
      clearCookie: jest.fn(),
      cookie: jest.fn(),
      redirect: jest.fn(),
    }) as any;

  const mockOAuthStatePreviewAndConsume = (record: Record<string, unknown>) => {
    (oauthStateStore.read as jest.Mock).mockResolvedValueOnce(record);
    (oauthStateStore.consume as jest.Mock).mockResolvedValueOnce(record);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    initialNodeEnv = envs.NODE_ENV;
    (oauthStateStore.read as jest.Mock).mockResolvedValue(null);
    service = {
      login: jest.fn(),
      revokeSessionByRefreshTokenAndAudit: jest.fn().mockResolvedValue(undefined),
      revokeAllSessionsByConsumerIdAndAudit: jest.fn().mockResolvedValue(undefined),
      refreshAccess: jest.fn().mockResolvedValue({ accessToken: `a`, refreshToken: `r` }),
      findConsumerByEmail: jest.fn(),
      issueTokensForConsumer: jest.fn(),
      completeProfileCreationAndSendVerificationEmail: jest.fn().mockResolvedValue(undefined),
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
      signup: jest.fn(),
      signupVerification: jest.fn().mockResolvedValue(undefined),
    };

    controller = new ConsumerAuthController(
      service as ConsumerAuthService,
      googleOAuthService as GoogleOAuthService,
      oauthStateStore as OAuthStateStoreService,
      originResolver as OriginResolverService,
      new ConsumerAuthControllerSupportService(originResolver as OriginResolverService),
    );
  });

  afterEach(() => {
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

  it(`rejects logout when csrf matches but app scope header is missing`, async () => {
    const req = makeReq({
      headers: { 'x-csrf-token': `csrf-token` },
      cookies: { [CSRF_TOKEN_COOKIE_KEY]: `csrf-token` },
    });

    await expect(controller.logout(req, makeRes())).rejects.toBeInstanceOf(UnauthorizedException);
    expect(service.revokeSessionByRefreshTokenAndAudit).not.toHaveBeenCalled();
  });

  it(`accepts logout with matching csrf token and explicit app scope header`, async () => {
    const consumerCsrfCookieKey = getScopedConsumerCsrfTokenCookieKey(CURRENT_CONSUMER_APP_SCOPE, {
      isProduction: false,
      isVercel: false,
      cookieSecure: false,
      isSecureRequest: false,
    });
    const req = makeReq({
      headers: {
        [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE,
        'x-csrf-token': `csrf-token`,
      },
      cookies: { [consumerCsrfCookieKey]: `csrf-token` },
    });

    await controller.logout(req, makeRes());

    expect(originResolver.validateConsumerAppScopeHeader).toHaveBeenCalledWith(CURRENT_CONSUMER_APP_SCOPE);
    expect(service.revokeSessionByRefreshTokenAndAudit).toHaveBeenCalled();
  });

  it(`login rejects invalid claimed app scope`, async () => {
    const req = makeReq({ headers: { [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE } });
    const res = makeRes();

    await expect(
      controller.login(req, res, { email: `user@example.com`, password: `secret` } as any, `unknown-scope` as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.login).not.toHaveBeenCalled();
  });

  it(`google callback resolves access_denied by stored app scope without requiring a cookie in test env`, async () => {
    const req = makeReq({ cookies: {} });
    const res = makeRes();
    (oauthStateStore.read as jest.Mock).mockResolvedValueOnce({
      createdAt: Date.now(),
      codeVerifier: `verifier`,
      nonce: `nonce`,
      nextPath: `/dashboard`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });

    await controller.googleOAuthCallback(req, res, undefined, `state-token`, `access_denied`);

    expect(oauthStateStore.read).toHaveBeenCalledWith(`state-token`);
    expect(oauthStateStore.consume).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(`https://grid.example.com/login?oauth=google&error=access_denied`);
  });

  it(`google callback preserves app scope for access_denied`, async () => {
    const req = makeReq({ cookies: { [GOOGLE_OAUTH_STATE_COOKIE_KEY]: `state-token` } });
    const res = makeRes();
    (oauthStateStore.read as jest.Mock).mockResolvedValueOnce({
      createdAt: Date.now(),
      codeVerifier: `verifier`,
      nonce: `nonce`,
      nextPath: `/dashboard`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });

    await controller.googleOAuthCallback(req, res, undefined, `state-token`, `access_denied`);

    expect(originResolver.resolveConsumerOriginByScope).toHaveBeenCalledWith(CURRENT_CONSUMER_APP_SCOPE);
    expect(oauthStateStore.consume).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(`https://grid.example.com/login?oauth=google&error=access_denied`);
  });

  it(`google callback routes callbacks by the canonical stored app scope`, async () => {
    const cssGridOauthCookieKey = getScopedConsumerGoogleOAuthStateCookieKey(CURRENT_CONSUMER_APP_SCOPE, {
      isProduction: false,
      isVercel: false,
      cookieSecure: false,
      isSecureRequest: false,
    });
    const req = makeReq({
      cookies: {
        [GOOGLE_OAUTH_STATE_COOKIE_KEY]: `wrong-scope-state`,
        [cssGridOauthCookieKey]: `state-token`,
      },
    });
    const res = makeRes();
    (oauthStateStore.read as jest.Mock).mockResolvedValueOnce({
      createdAt: Date.now(),
      codeVerifier: `verifier`,
      nonce: `nonce`,
      nextPath: `/dashboard`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });

    await controller.googleOAuthCallback(req, res, undefined, `state-token`, `access_denied`);

    expect(originResolver.resolveConsumerOriginByScope).toHaveBeenCalledWith(CURRENT_CONSUMER_APP_SCOPE);
    expect(res.clearCookie).toHaveBeenCalledWith(cssGridOauthCookieKey, expect.any(Object));
    expect(oauthStateStore.consume).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(`https://grid.example.com/login?oauth=google&error=access_denied`);
  });

  it(`google callback does not consume valid state when cookie does not match in production`, async () => {
    envs.NODE_ENV = envs.ENVIRONMENT.PRODUCTION;
    const req = makeReq({ cookies: { [GOOGLE_OAUTH_STATE_COOKIE_KEY]: `different-state` } });
    const res = makeRes();
    (oauthStateStore.read as jest.Mock).mockResolvedValueOnce({
      createdAt: Date.now(),
      codeVerifier: `verifier`,
      nonce: `nonce`,
      nextPath: `/dashboard`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });
    await controller.googleOAuthCallback(req, res, `oauth-code`, `state-token`, undefined);
    expect(oauthStateStore.consume).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining(`error=invalid_state`));
  });

  it(`google callback can consume state without cookie in test env`, async () => {
    mockOAuthStatePreviewAndConsume({
      createdAt: Date.now(),
      codeVerifier: `verifier`,
      nonce: `nonce`,
      nextPath: `/dashboard`,
      accountType: null,
      contractorKind: null,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
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
    mockOAuthStatePreviewAndConsume({
      createdAt: Date.now(),
      codeVerifier: `verifier`,
      nonce: `nonce`,
      nextPath: `/dashboard`,
      accountType: null,
      contractorKind: null,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
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
      expect.objectContaining({ identityId: `consumer-id`, nextPath: `/dashboard` }),
      expect.any(Number),
    );
    expect(res.redirect).toHaveBeenCalledWith(
      `https://grid.example.com/auth/callback?next=%2Fdashboard&oauthHandoff=handoff-token`,
    );
  });

  it(`google callback normalizes signup next paths to dashboard for existing consumers`, async () => {
    mockOAuthStatePreviewAndConsume({
      createdAt: Date.now(),
      codeVerifier: `verifier`,
      nonce: `nonce`,
      nextPath: `/signup?accountType=BUSINESS`,
      accountType: `BUSINESS`,
      contractorKind: null,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
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
      `https://grid.example.com/auth/callback?next=%2Fdashboard&oauthHandoff=handoff-token`,
    );
  });

  it(`google callback returns unregistered consumers to signup when next pathname is signup`, async () => {
    mockOAuthStatePreviewAndConsume({
      createdAt: Date.now(),
      codeVerifier: `verifier`,
      nonce: `nonce`,
      nextPath: `/signup?accountType=CONTRACTOR&contractorKind=ENTITY`,
      accountType: `CONTRACTOR`,
      contractorKind: `ENTITY`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
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
      expect.objectContaining({ email: `new-user@example.com`, accountType: `CONTRACTOR`, contractorKind: `ENTITY` }),
      expect.any(Number),
    );
    expect(res.redirect).toHaveBeenCalledWith(
      `https://grid.example.com/signup?googleSignupHandoff=handoff-token&accountType=CONTRACTOR&contractorKind=ENTITY`,
    );
  });

  it(`google callback returns unregistered consumers to signup start for non-signup next paths`, async () => {
    mockOAuthStatePreviewAndConsume({
      createdAt: Date.now(),
      codeVerifier: `verifier`,
      nonce: `nonce`,
      nextPath: `/dashboard`,
      accountType: `BUSINESS`,
      contractorKind: null,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
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
      `https://grid.example.com/signup/start?googleSignupHandoff=handoff-token&accountType=BUSINESS`,
    );
  });

  it.each([
    [
      CURRENT_CONSUMER_APP_SCOPE,
      `https://grid.example.com/signup/start?googleSignupHandoff=handoff-token&accountType=BUSINESS`,
    ],
  ] as const)(`google callback preserves %s signup handoff routing`, async (appScope, expectedRedirect) => {
    mockOAuthStatePreviewAndConsume({
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
    envs.NODE_ENV = envs.ENVIRONMENT.PRODUCTION;
    const req = makeReq({ cookies: {} });
    const res = makeRes();
    (oauthStateStore.read as jest.Mock).mockResolvedValueOnce({
      createdAt: Date.now(),
      codeVerifier: `verifier`,
      nonce: `nonce`,
      nextPath: `/dashboard`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });

    await controller.googleOAuthCallback(req, res, `oauth-code`, `state-token`, undefined);

    expect(oauthStateStore.consume).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining(`error=invalid_state`));
  });

  it(`google callback blocks missing-state-cookie fallback in staging`, async () => {
    envs.NODE_ENV = envs.ENVIRONMENT.STAGING;
    const req = makeReq({ cookies: {} });
    const res = makeRes();
    (oauthStateStore.read as jest.Mock).mockResolvedValueOnce({
      createdAt: Date.now(),
      codeVerifier: `verifier`,
      nonce: `nonce`,
      nextPath: `/dashboard`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });

    await controller.googleOAuthCallback(req, res, `oauth-code`, `state-token`, undefined);

    expect(oauthStateStore.consume).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining(`error=invalid_state`));
  });

  it(`google signup session rejects invalid claimed app scope`, async () => {
    (oauthStateStore.readSignupSession as jest.Mock).mockResolvedValueOnce({
      email: `new@example.com`,
      emailVerified: true,
      nextPath: `/dashboard`,
      signupEntryPath: `/signup/start`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });
    const req = makeReq({
      headers: { [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE },
      cookies: { consumer_css_grid_google_signup_session: `signup-session-token` },
    });

    await expect(controller.googleSignupSession(req, `unknown-scope` as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it(`google signup session establish rejects invalid claimed app scope`, async () => {
    (oauthStateStore.consumeSignupHandoff as jest.Mock).mockResolvedValueOnce({
      email: `new@example.com`,
      emailVerified: true,
      nextPath: `/dashboard`,
      signupEntryPath: `/signup/start`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });
    const req = makeReq({ headers: { [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE } });

    await expect(
      controller.establishGoogleSignupSession(
        req,
        makeRes(),
        { handoffToken: `handoff-token` },
        `unknown-scope` as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it(`establishGoogleSignupSession consumes handoff, persists signup session, and sets httpOnly cookie`, async () => {
    (oauthStateStore.consumeSignupHandoff as jest.Mock).mockResolvedValueOnce({
      email: `new@example.com`,
      emailVerified: true,
      nextPath: `/dashboard`,
      signupEntryPath: `/signup/start`,
      name: null,
      givenName: `Ada`,
      familyName: `Lovelace`,
      picture: null,
      organization: null,
      sub: `sub`,
      accountType: `BUSINESS`,
      contractorKind: null,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });
    (oauthStateStore.createEphemeralToken as jest.Mock).mockReturnValueOnce(`signup-session-token`);
    const req = makeReq({ headers: { [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE } });
    const res = makeRes();

    const result = await controller.establishGoogleSignupSession(
      req,
      res,
      { handoffToken: `handoff-token` },
      CURRENT_CONSUMER_APP_SCOPE,
    );

    expect(oauthStateStore.consumeSignupHandoff).toHaveBeenCalledWith(`handoff-token`);
    expect(oauthStateStore.saveSignupSession).toHaveBeenCalledWith(
      `signup-session-token`,
      expect.objectContaining({ email: `new@example.com`, appScope: CURRENT_CONSUMER_APP_SCOPE }),
      expect.any(Number),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      getApiConsumerGoogleSignupSessionCookieKey(req, CURRENT_CONSUMER_APP_SCOPE),
      `signup-session-token`,
      expect.objectContaining({ httpOnly: true, maxAge: expect.any(Number) }),
    );
    expect(result).toMatchObject({
      email: `new@example.com`,
      nextPath: `/dashboard`,
      signupEntryPath: `/signup/start`,
    });
  });

  it(`oauth complete rejects invalid claimed app scope`, async () => {
    (oauthStateStore.consumeLoginHandoff as jest.Mock).mockResolvedValueOnce({
      identityId: `consumer-id`,
      nextPath: `/dashboard`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });
    const req = makeReq({ headers: { [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE } });

    await expect(
      controller.oauthComplete(req, makeRes(), { handoffToken: `handoff-token` }, `unknown-scope` as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.issueTokensForConsumer).not.toHaveBeenCalled();
  });

  it(`google start requires app scope and stores it in state`, async () => {
    const req = makeReq();
    const res = makeRes();

    await controller.googleOAuthStart(req, res, CURRENT_CONSUMER_APP_SCOPE, undefined, undefined, undefined, undefined);

    expect(originResolver.validateConsumerAppScope).toHaveBeenCalledWith(CURRENT_CONSUMER_APP_SCOPE);
    expect(oauthStateStore.save).toHaveBeenCalledWith(
      `state-token`,
      expect.objectContaining({ appScope: CURRENT_CONSUMER_APP_SCOPE }),
      expect.any(Number),
    );
    expect(res.redirect).toHaveBeenCalledWith(`https://accounts.google.com/o/oauth2/v2/auth`);
  });

  it(`google start uses css-grid app scope for cookie and state`, async () => {
    const cssGridOauthCookieKey = getScopedConsumerGoogleOAuthStateCookieKey(CURRENT_CONSUMER_APP_SCOPE, {
      isProduction: false,
      isVercel: false,
      cookieSecure: false,
      isSecureRequest: false,
    });
    const req = makeReq();
    const res = makeRes();

    await controller.googleOAuthStart(
      req,
      res,
      CURRENT_CONSUMER_APP_SCOPE,
      `/dashboard`,
      undefined,
      undefined,
      undefined,
    );

    expect(originResolver.validateConsumerAppScope).toHaveBeenCalledWith(CURRENT_CONSUMER_APP_SCOPE);
    expect(oauthStateStore.save).toHaveBeenCalledWith(
      `state-token`,
      expect.objectContaining({ appScope: CURRENT_CONSUMER_APP_SCOPE }),
      expect.any(Number),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      cssGridOauthCookieKey,
      `state-token`,
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it(`google start sets the canonical oauth state cookie for the canonical app scope`, async () => {
    const mobileOauthCookieKey = getScopedConsumerGoogleOAuthStateCookieKey(CURRENT_CONSUMER_APP_SCOPE, {
      isProduction: false,
      isVercel: false,
      cookieSecure: false,
      isSecureRequest: false,
    });
    const req = makeReq();
    const res = makeRes();

    await controller.googleOAuthStart(req, res, CURRENT_CONSUMER_APP_SCOPE, undefined, undefined, undefined, undefined);

    expect(res.cookie).toHaveBeenCalledWith(
      mobileOauthCookieKey,
      `state-token`,
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it(`refresh reads canonical refresh/csrf cookies and rotates canonical auth cookies`, async () => {
    const [mobileRefreshCookieKey] = getScopedConsumerRefreshTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
    const [mobileCsrfCookieKey] = getScopedConsumerCsrfTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
    const req = makeReq({
      headers: {
        [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE,
        'x-csrf-token': `csrf-token`,
      },
      cookies: {
        [mobileRefreshCookieKey]: `mobile-refresh-token`,
        [mobileCsrfCookieKey]: `csrf-token`,
      },
    });
    const res = makeRes();

    await controller.refreshAccess(req, res);

    expect(service.refreshAccess).toHaveBeenCalledWith(
      `mobile-refresh-token`,
      CURRENT_CONSUMER_APP_SCOPE,
      expect.any(Object),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      expect.stringMatching(/consumer_css_grid_access_token/),
      `a`,
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      expect.stringMatching(/consumer_css_grid_refresh_token/),
      `r`,
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      expect.stringMatching(/consumer_css_grid_csrf_token/),
      expect.any(String),
      expect.objectContaining({ httpOnly: false }),
    );
  });

  it(`google start preserves normalized signup next paths without a separate signup entry field`, async () => {
    const req = makeReq();
    const res = makeRes();
    await controller.googleOAuthStart(
      req,
      res,
      CURRENT_CONSUMER_APP_SCOPE,
      `/signup?accountType=BUSINESS`,
      undefined,
      `BUSINESS`,
      undefined,
    );

    const savedRecord = (oauthStateStore.save as jest.Mock).mock.calls[0]?.[1] as Record<string, unknown>;
    expect(savedRecord).toMatchObject({
      nextPath: `/signup?accountType=BUSINESS`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
      signupEntryPath: `/signup`,
      accountType: `BUSINESS`,
    });
  });

  it(`google start accepts browser redirects without a request app scope header`, async () => {
    const req = makeReq();
    const res = makeRes();

    await controller.googleOAuthStart(req, res, CURRENT_CONSUMER_APP_SCOPE, undefined, undefined, undefined, undefined);

    expect(oauthStateStore.save).toHaveBeenCalledWith(
      `state-token`,
      expect.objectContaining({ appScope: CURRENT_CONSUMER_APP_SCOPE }),
      expect.any(Number),
    );
  });

  it.each([[CURRENT_CONSUMER_APP_SCOPE, { [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE }]] as const)(
    `forgot password accepts %s when header app scope matches claimed scope`,
    async (expectedScope, headers) => {
      const req = makeReq({ headers });

      const result = await controller.forgotPassword(req, { email: `user@example.com` } as any, expectedScope);

      expect(originResolver.validateConsumerAppScopeHeader).toHaveBeenCalledWith(expectedScope);
      expect(service.requestPasswordReset).toHaveBeenCalledWith(`user@example.com`, expectedScope);
      expect(result).toEqual({
        message: `If an account exists, we sent recovery instructions.`,
        recoveryMode: `provider_aware`,
      });
    },
  );

  it(`forgot password rejects invalid claimed app scope`, async () => {
    const req = makeReq({ headers: { [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE } });

    await expect(
      controller.forgotPassword(req, { email: `user@example.com` } as any, `unknown-scope` as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.requestPasswordReset).not.toHaveBeenCalled();
  });

  it(`forgot password verify delegates using token only`, async () => {
    const res = makeRes();

    await controller.forgotPasswordVerify(`reset-token`, res);

    expect(service.validateForgotPasswordTokenAndRedirect).toHaveBeenCalledWith(`reset-token`, res);
  });

  it(`completeProfileCreation sends verification using the canonical app scope`, async () => {
    const req = makeReq({
      headers: {
        [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE,
      },
    });

    const result = controller.completeProfileCreation(req, `consumer-id`, CURRENT_CONSUMER_APP_SCOPE);

    expect(originResolver.validateConsumerAppScopeHeader).toHaveBeenCalledWith(CURRENT_CONSUMER_APP_SCOPE);
    expect(service.completeProfileCreationAndSendVerificationEmail).toHaveBeenCalledWith(
      `consumer-id`,
      CURRENT_CONSUMER_APP_SCOPE,
    );
    expect(result).toBe(`success`);
  });

  it(`completeProfileCreation rejects invalid claimed app scope`, async () => {
    const req = makeReq({
      headers: {
        [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE,
      },
    });

    expect(() => controller.completeProfileCreation(req, `consumer-id`, `unknown-scope` as never)).toThrow(
      BadRequestException,
    );
    expect(service.completeProfileCreationAndSendVerificationEmail).not.toHaveBeenCalled();
  });

  it(`signup verification delegates using token only`, async () => {
    const res = makeRes();

    await controller.signupVerification(`signup-token`, res);

    expect(service.signupVerification).toHaveBeenCalledWith(`signup-token`, res);
  });

  it(`signup rejects invalid claimed app scope for stored google signup sessions`, async () => {
    (oauthStateStore.readSignupSession as jest.Mock | undefined)?.mockResolvedValue({
      nextPath: `/dashboard`,
      email: `new@example.com`,
      emailVerified: true,
      type: `google_signup`,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });

    const req = makeReq({
      headers: { [CONSUMER_APP_SCOPE_HEADER]: CURRENT_CONSUMER_APP_SCOPE },
      cookies: { consumer_css_grid_google_signup_session: `signup-session-token` },
    });

    await expect(
      controller.signup(
        req,
        makeRes(),
        {
          email: `new@example.com`,
          accountType: `BUSINESS`,
          addressDetails: { postalCode: `1`, country: `US` } as any,
        } as any,
        `unknown-scope` as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.signup).not.toHaveBeenCalled();
  });

  it(`resetPassword delegates to service and returns success`, async () => {
    const body = { token: `reset-token`, password: `newPassword8` };
    const result = await controller.resetPassword(body);

    expect(service.resetPasswordWithToken).toHaveBeenCalledWith(`reset-token`, `newPassword8`);
    expect(result).toEqual({ success: true });
  });

  it(`resetPassword propagates BadRequestException from service`, async () => {
    (service.resetPasswordWithToken as jest.Mock).mockRejectedValueOnce(
      new BadRequestException(`INVALID_CHANGE_PASSWORD_TOKEN`),
    );
    const body = { token: `bad-token`, password: `newPassword8` };

    await expect(controller.resetPassword(body)).rejects.toThrow(BadRequestException);
  });
});
