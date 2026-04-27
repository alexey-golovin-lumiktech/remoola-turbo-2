import { isAdminApiPath } from './admin-path';
import { COOKIE_KEYS, type TCookieKey } from './constants';

/** Max age for device cookie in seconds (e.g. 365 days). */
export const DEVICE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

const ROOT_COOKIE_PATH = `/` as const;
const CONSUMER_API_PATH_PREFIX = `/api/consumer/`;

export type AuthCookieSameSite = `lax` | `none` | `strict`;

export type SharedCookieOptions = {
  path: typeof ROOT_COOKIE_PATH;
  secure: boolean;
  sameSite: AuthCookieSameSite;
};

export type SharedHttpOnlyCookieOptions = SharedCookieOptions & {
  httpOnly: true;
};

export type SharedReadableCookieOptions = SharedCookieOptions & {
  httpOnly: false;
};

export type AuthCookieRuntime = {
  isProduction: boolean;
  isVercel: boolean;
  cookieSecure: boolean;
};

export type OAuthCookieRuntime = AuthCookieRuntime & {
  isSecureRequest: boolean;
};

function resolveSecure(runtime: AuthCookieRuntime): boolean {
  return runtime.isVercel || runtime.isProduction || runtime.cookieSecure;
}

export type ConsumerCookieRuntime = AuthCookieRuntime & {
  isSecureRequest?: boolean;
};

export type ConsumerAppScope = `consumer-css-grid`;
export type LegacyConsumerAppScopeAlias = `consumer` | `consumer-mobile`;
export type ConsumerAppScopeInput = ConsumerAppScope | LegacyConsumerAppScopeAlias;

export const CURRENT_CONSUMER_APP_SCOPE = `consumer-css-grid` as const satisfies ConsumerAppScope;
const LEGACY_CONSUMER_APP_SCOPE_ALIASES = [
  `consumer`,
  `consumer-mobile`,
  CURRENT_CONSUMER_APP_SCOPE,
] as const satisfies readonly ConsumerAppScopeInput[];

export const CONSUMER_APP_SCOPES = [CURRENT_CONSUMER_APP_SCOPE] as const satisfies readonly ConsumerAppScope[];

export function isConsumerAppScope(value: string | null | undefined): value is ConsumerAppScope {
  return value === CURRENT_CONSUMER_APP_SCOPE;
}

export function normalizeLegacyConsumerAppScope(value: string | null | undefined): ConsumerAppScope | undefined {
  return typeof value === `string` && LEGACY_CONSUMER_APP_SCOPE_ALIASES.includes(value as ConsumerAppScopeInput)
    ? CURRENT_CONSUMER_APP_SCOPE
    : undefined;
}

type ConsumerScopeCookieKeys = {
  accessToken: TCookieKey;
  localAccessToken: TCookieKey;
  refreshToken: TCookieKey;
  localRefreshToken: TCookieKey;
  csrfToken: TCookieKey;
  localCsrfToken: TCookieKey;
  oauthState: TCookieKey;
  localOauthState: TCookieKey;
  deviceId: TCookieKey;
  localDeviceId: TCookieKey;
  googleSignupSession: TCookieKey;
  localGoogleSignupSession: TCookieKey;
};

function shouldUseLocalAdminCookieFallback(runtime: AuthCookieRuntime): boolean {
  return !resolveSecure(runtime);
}

function shouldUseLocalConsumerCookieFallback(runtime: ConsumerCookieRuntime): boolean {
  return !(runtime.isVercel || runtime.isProduction || runtime.cookieSecure || runtime.isSecureRequest);
}

function selectAdminCookieKey(runtime: AuthCookieRuntime, secureKey: TCookieKey, localKey: TCookieKey): TCookieKey {
  return shouldUseLocalAdminCookieFallback(runtime) ? localKey : secureKey;
}

function selectConsumerCookieKey(
  runtime: ConsumerCookieRuntime,
  secureKey: TCookieKey,
  localKey: TCookieKey,
): TCookieKey {
  return shouldUseLocalConsumerCookieFallback(runtime) ? localKey : secureKey;
}

function getConsumerScopeCookieKeys(_scope: ConsumerAppScopeInput): ConsumerScopeCookieKeys {
  return {
    accessToken: COOKIE_KEYS.API_V2_CONSUMER_ACCESS_TOKEN,
    localAccessToken: COOKIE_KEYS.LOCAL_API_V2_CONSUMER_ACCESS_TOKEN,
    refreshToken: COOKIE_KEYS.API_V2_CONSUMER_REFRESH_TOKEN,
    localRefreshToken: COOKIE_KEYS.LOCAL_API_V2_CONSUMER_REFRESH_TOKEN,
    csrfToken: COOKIE_KEYS.API_V2_CSRF_TOKEN,
    localCsrfToken: COOKIE_KEYS.LOCAL_API_V2_CSRF_TOKEN,
    oauthState: COOKIE_KEYS.API_V2_GOOGLE_OAUTH_STATE,
    localOauthState: COOKIE_KEYS.LOCAL_API_V2_GOOGLE_OAUTH_STATE,
    deviceId: COOKIE_KEYS.API_V2_CONSUMER_DEVICE_ID,
    localDeviceId: COOKIE_KEYS.LOCAL_API_V2_CONSUMER_DEVICE_ID,
    googleSignupSession: COOKIE_KEYS.API_V2_CONSUMER_GOOGLE_SIGNUP_SESSION,
    localGoogleSignupSession: COOKIE_KEYS.LOCAL_API_V2_CONSUMER_GOOGLE_SIGNUP_SESSION,
  };
}

export function getAdminAccessTokenCookieKey(runtime: AuthCookieRuntime): TCookieKey {
  return selectAdminCookieKey(runtime, COOKIE_KEYS.ADMIN_ACCESS_TOKEN, COOKIE_KEYS.LOCAL_ADMIN_ACCESS_TOKEN);
}

export function getAdminRefreshTokenCookieKey(runtime: AuthCookieRuntime): TCookieKey {
  return selectAdminCookieKey(runtime, COOKIE_KEYS.ADMIN_REFRESH_TOKEN, COOKIE_KEYS.LOCAL_ADMIN_REFRESH_TOKEN);
}

export function getAdminCsrfTokenCookieKey(runtime: AuthCookieRuntime): TCookieKey {
  return selectAdminCookieKey(runtime, COOKIE_KEYS.ADMIN_CSRF_TOKEN, COOKIE_KEYS.LOCAL_ADMIN_CSRF_TOKEN);
}

export function getAdminAccessTokenCookieKeysForRead(): readonly TCookieKey[] {
  return [COOKIE_KEYS.ADMIN_ACCESS_TOKEN, COOKIE_KEYS.LOCAL_ADMIN_ACCESS_TOKEN];
}

export function getAdminRefreshTokenCookieKeysForRead(): readonly TCookieKey[] {
  return [COOKIE_KEYS.ADMIN_REFRESH_TOKEN, COOKIE_KEYS.LOCAL_ADMIN_REFRESH_TOKEN];
}

export function getAdminCsrfTokenCookieKeysForRead(): readonly TCookieKey[] {
  return [COOKIE_KEYS.ADMIN_CSRF_TOKEN, COOKIE_KEYS.LOCAL_ADMIN_CSRF_TOKEN];
}

export function getScopedConsumerAccessTokenCookieKey(
  scope: ConsumerAppScopeInput,
  runtime: ConsumerCookieRuntime,
): TCookieKey {
  const keys = getConsumerScopeCookieKeys(scope);
  return selectConsumerCookieKey(runtime, keys.accessToken, keys.localAccessToken);
}

export function getScopedConsumerRefreshTokenCookieKey(
  scope: ConsumerAppScopeInput,
  runtime: ConsumerCookieRuntime,
): TCookieKey {
  const keys = getConsumerScopeCookieKeys(scope);
  return selectConsumerCookieKey(runtime, keys.refreshToken, keys.localRefreshToken);
}

export function getScopedConsumerCsrfTokenCookieKey(
  scope: ConsumerAppScopeInput,
  runtime: ConsumerCookieRuntime,
): TCookieKey {
  const keys = getConsumerScopeCookieKeys(scope);
  return selectConsumerCookieKey(runtime, keys.csrfToken, keys.localCsrfToken);
}

export function getScopedConsumerGoogleOAuthStateCookieKey(
  scope: ConsumerAppScopeInput,
  runtime?: ConsumerCookieRuntime,
): TCookieKey {
  const keys = getConsumerScopeCookieKeys(scope);
  if (!runtime) {
    return keys.oauthState;
  }
  return selectConsumerCookieKey(runtime, keys.oauthState, keys.localOauthState);
}

export function getScopedConsumerDeviceCookieKey(scope: ConsumerAppScopeInput, runtime: ConsumerCookieRuntime): TCookieKey {
  const keys = getConsumerScopeCookieKeys(scope);
  return selectConsumerCookieKey(runtime, keys.deviceId, keys.localDeviceId);
}

export function getScopedConsumerGoogleSignupSessionCookieKey(
  scope: ConsumerAppScopeInput,
  runtime: ConsumerCookieRuntime,
): TCookieKey {
  const keys = getConsumerScopeCookieKeys(scope);
  return selectConsumerCookieKey(runtime, keys.googleSignupSession, keys.localGoogleSignupSession);
}

export function getScopedConsumerAccessTokenCookieKeysForRead(scope: ConsumerAppScopeInput): readonly TCookieKey[] {
  const keys = getConsumerScopeCookieKeys(scope);
  return [keys.accessToken, keys.localAccessToken];
}

export function getScopedConsumerRefreshTokenCookieKeysForRead(scope: ConsumerAppScopeInput): readonly TCookieKey[] {
  const keys = getConsumerScopeCookieKeys(scope);
  return [keys.refreshToken, keys.localRefreshToken];
}

export function getScopedConsumerCsrfTokenCookieKeysForRead(scope: ConsumerAppScopeInput): readonly TCookieKey[] {
  const keys = getConsumerScopeCookieKeys(scope);
  return [keys.csrfToken, keys.localCsrfToken];
}

export function getScopedConsumerGoogleOAuthStateCookieKeysForRead(scope: ConsumerAppScopeInput): readonly TCookieKey[] {
  const keys = getConsumerScopeCookieKeys(scope);
  return [keys.oauthState, keys.localOauthState];
}

export function getScopedConsumerDeviceCookieKeysForRead(scope: ConsumerAppScopeInput): readonly TCookieKey[] {
  const keys = getConsumerScopeCookieKeys(scope);
  return [keys.deviceId, keys.localDeviceId];
}

export function getScopedConsumerGoogleSignupSessionCookieKeysForRead(scope: ConsumerAppScopeInput): readonly TCookieKey[] {
  const keys = getConsumerScopeCookieKeys(scope);
  return [keys.googleSignupSession, keys.localGoogleSignupSession];
}

export function getConsumerAccessTokenCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerAccessTokenCookieKey(CURRENT_CONSUMER_APP_SCOPE, runtime);
}

export function getConsumerMobileAccessTokenCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerAccessTokenCookieKey(CURRENT_CONSUMER_APP_SCOPE, runtime);
}

export function getConsumerDeviceCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerDeviceCookieKey(CURRENT_CONSUMER_APP_SCOPE, runtime);
}

export function getConsumerMobileDeviceCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerDeviceCookieKey(CURRENT_CONSUMER_APP_SCOPE, runtime);
}

export function getConsumerGoogleSignupSessionCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerGoogleSignupSessionCookieKey(CURRENT_CONSUMER_APP_SCOPE, runtime);
}

export function getConsumerMobileGoogleSignupSessionCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerGoogleSignupSessionCookieKey(CURRENT_CONSUMER_APP_SCOPE, runtime);
}

export function getConsumerDeviceCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerDeviceCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
}

export function getConsumerMobileDeviceCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerDeviceCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
}

export function getConsumerGoogleSignupSessionCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerGoogleSignupSessionCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
}

export function getConsumerMobileGoogleSignupSessionCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerGoogleSignupSessionCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
}

export function getConsumerDeviceCookieOptions(runtime: ConsumerCookieRuntime): SharedHttpOnlyCookieOptions {
  return {
    httpOnly: true,
    sameSite: `lax`,
    secure: resolveConsumerSecure(runtime),
    path: ROOT_COOKIE_PATH,
  };
}

export function getConsumerRefreshTokenCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerRefreshTokenCookieKey(CURRENT_CONSUMER_APP_SCOPE, runtime);
}

export function getConsumerMobileRefreshTokenCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerRefreshTokenCookieKey(CURRENT_CONSUMER_APP_SCOPE, runtime);
}

export function getConsumerAccessTokenCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerAccessTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
}

export function getConsumerMobileAccessTokenCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerAccessTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
}

export function getConsumerRefreshTokenCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerRefreshTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
}

export function getConsumerMobileRefreshTokenCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerRefreshTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
}

export function getApiV2ConsumerAccessTokenCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerAccessTokenCookieKey(`consumer-css-grid`, runtime);
}

export function getApiV2ConsumerRefreshTokenCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerRefreshTokenCookieKey(`consumer-css-grid`, runtime);
}

export function getApiV2ConsumerDeviceCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerDeviceCookieKey(`consumer-css-grid`, runtime);
}

export function getApiV2ConsumerGoogleSignupSessionCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerGoogleSignupSessionCookieKey(`consumer-css-grid`, runtime);
}

export function getApiV2ConsumerAccessTokenCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerAccessTokenCookieKeysForRead(`consumer-css-grid`);
}

export function getApiV2ConsumerRefreshTokenCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerRefreshTokenCookieKeysForRead(`consumer-css-grid`);
}

export function getApiV2ConsumerDeviceCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerDeviceCookieKeysForRead(`consumer-css-grid`);
}

export function getApiV2ConsumerGoogleSignupSessionCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerGoogleSignupSessionCookieKeysForRead(`consumer-css-grid`);
}

export function getConsumerCsrfTokenCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerCsrfTokenCookieKey(CURRENT_CONSUMER_APP_SCOPE, runtime);
}

export function getConsumerMobileCsrfTokenCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerCsrfTokenCookieKey(CURRENT_CONSUMER_APP_SCOPE, runtime);
}

export function getConsumerCsrfTokenCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerCsrfTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
}

export function getConsumerMobileCsrfTokenCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerCsrfTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
}

export function getApiV2ConsumerCsrfTokenCookieKeyForRuntime(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerCsrfTokenCookieKey(`consumer-css-grid`, runtime);
}

export function getApiV2ConsumerCsrfTokenCookieKey(runtime?: ConsumerCookieRuntime): TCookieKey {
  if (!runtime) {
    return COOKIE_KEYS.API_V2_CSRF_TOKEN;
  }
  return getApiV2ConsumerCsrfTokenCookieKeyForRuntime(runtime);
}

export function getApiV2ConsumerCsrfTokenCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerCsrfTokenCookieKeysForRead(`consumer-css-grid`);
}

export function getGoogleOAuthStateCookieKey(runtime?: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerGoogleOAuthStateCookieKey(CURRENT_CONSUMER_APP_SCOPE, runtime);
}

export function getConsumerMobileGoogleOAuthStateCookieKey(runtime?: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerGoogleOAuthStateCookieKey(CURRENT_CONSUMER_APP_SCOPE, runtime);
}

export function getGoogleOAuthStateCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerGoogleOAuthStateCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
}

export function getConsumerMobileGoogleOAuthStateCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerGoogleOAuthStateCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
}

export function getApiV2GoogleOAuthStateCookieKey(runtime?: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerGoogleOAuthStateCookieKey(`consumer-css-grid`, runtime);
}

export function getApiV2GoogleOAuthStateCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerGoogleOAuthStateCookieKeysForRead(`consumer-css-grid`);
}

function resolveConsumerSecure(runtime: ConsumerCookieRuntime): boolean {
  return !shouldUseLocalConsumerCookieFallback(runtime);
}

export function getConsumerAuthCookieOptions(runtime: ConsumerCookieRuntime): SharedHttpOnlyCookieOptions {
  return {
    httpOnly: true,
    sameSite: `lax`,
    secure: resolveConsumerSecure(runtime),
    path: ROOT_COOKIE_PATH,
  };
}

export function getAdminAuthCookieOptions(runtime: AuthCookieRuntime): SharedHttpOnlyCookieOptions {
  if (runtime.isVercel) {
    return {
      httpOnly: true,
      sameSite: `none`,
      secure: true,
      path: ROOT_COOKIE_PATH,
    };
  }

  return {
    httpOnly: true,
    sameSite: runtime.isProduction ? `none` : `lax`,
    secure: runtime.isProduction || runtime.cookieSecure,
    path: ROOT_COOKIE_PATH,
  };
}

export function getCsrfCookieOptions(runtime: ConsumerCookieRuntime): SharedReadableCookieOptions {
  return {
    httpOnly: false,
    sameSite: `lax`,
    secure: resolveConsumerSecure(runtime),
    path: ROOT_COOKIE_PATH,
  };
}

export function getOAuthStateCookieOptions(runtime: OAuthCookieRuntime): SharedHttpOnlyCookieOptions {
  return {
    httpOnly: true,
    sameSite: runtime.isSecureRequest ? `none` : `lax`,
    secure: runtime.isSecureRequest || resolveSecure(runtime),
    path: ROOT_COOKIE_PATH,
  };
}

export function getCookieClearOptions<T extends SharedCookieOptions & { httpOnly: boolean }>(
  options: T,
): Pick<T, `httpOnly` | `path` | `sameSite` | `secure`> {
  return {
    httpOnly: options.httpOnly,
    path: options.path,
    sameSite: options.sameSite,
    secure: options.secure,
  };
}

export function resolveAccessTokenCookieKeysForPath(
  path: string,
  consumerScope: ConsumerAppScope = CURRENT_CONSUMER_APP_SCOPE,
): readonly TCookieKey[] {
  if (isAdminApiPath(path)) return getAdminAccessTokenCookieKeysForRead();
  if (path.startsWith(CONSUMER_API_PATH_PREFIX)) return getScopedConsumerAccessTokenCookieKeysForRead(consumerScope);
  return getScopedConsumerAccessTokenCookieKeysForRead(consumerScope);
}
