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

export const CURRENT_CONSUMER_APP_SCOPE = `consumer-css-grid` as const satisfies ConsumerAppScope;

export const CONSUMER_APP_SCOPES = [CURRENT_CONSUMER_APP_SCOPE] as const satisfies readonly ConsumerAppScope[];

function isConsumerAppScope(value: string | null | undefined): value is ConsumerAppScope {
  return value === CURRENT_CONSUMER_APP_SCOPE;
}

export function parseConsumerAppScope(value: string | null | undefined): ConsumerAppScope | undefined {
  return isConsumerAppScope(value) ? value : undefined;
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

function getConsumerScopeCookieKeys(scope: ConsumerAppScope): ConsumerScopeCookieKeys {
  void scope;
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
  scope: ConsumerAppScope,
  runtime: ConsumerCookieRuntime,
): TCookieKey {
  const keys = getConsumerScopeCookieKeys(scope);
  return selectConsumerCookieKey(runtime, keys.accessToken, keys.localAccessToken);
}

export function getScopedConsumerRefreshTokenCookieKey(
  scope: ConsumerAppScope,
  runtime: ConsumerCookieRuntime,
): TCookieKey {
  const keys = getConsumerScopeCookieKeys(scope);
  return selectConsumerCookieKey(runtime, keys.refreshToken, keys.localRefreshToken);
}

export function getScopedConsumerCsrfTokenCookieKey(
  scope: ConsumerAppScope,
  runtime: ConsumerCookieRuntime,
): TCookieKey {
  const keys = getConsumerScopeCookieKeys(scope);
  return selectConsumerCookieKey(runtime, keys.csrfToken, keys.localCsrfToken);
}

export function getScopedConsumerGoogleOAuthStateCookieKey(
  scope: ConsumerAppScope,
  runtime?: ConsumerCookieRuntime,
): TCookieKey {
  const keys = getConsumerScopeCookieKeys(scope);
  if (!runtime) {
    return keys.oauthState;
  }
  return selectConsumerCookieKey(runtime, keys.oauthState, keys.localOauthState);
}

export function getScopedConsumerDeviceCookieKey(
  scope: ConsumerAppScope,
  runtime: ConsumerCookieRuntime,
): TCookieKey {
  const keys = getConsumerScopeCookieKeys(scope);
  return selectConsumerCookieKey(runtime, keys.deviceId, keys.localDeviceId);
}

export function getScopedConsumerGoogleSignupSessionCookieKey(
  scope: ConsumerAppScope,
  runtime: ConsumerCookieRuntime,
): TCookieKey {
  const keys = getConsumerScopeCookieKeys(scope);
  return selectConsumerCookieKey(runtime, keys.googleSignupSession, keys.localGoogleSignupSession);
}

export function getScopedConsumerAccessTokenCookieKeysForRead(scope: ConsumerAppScope): readonly TCookieKey[] {
  const keys = getConsumerScopeCookieKeys(scope);
  return [keys.accessToken, keys.localAccessToken];
}

export function getScopedConsumerRefreshTokenCookieKeysForRead(scope: ConsumerAppScope): readonly TCookieKey[] {
  const keys = getConsumerScopeCookieKeys(scope);
  return [keys.refreshToken, keys.localRefreshToken];
}

export function getScopedConsumerCsrfTokenCookieKeysForRead(scope: ConsumerAppScope): readonly TCookieKey[] {
  const keys = getConsumerScopeCookieKeys(scope);
  return [keys.csrfToken, keys.localCsrfToken];
}

export function getScopedConsumerGoogleOAuthStateCookieKeysForRead(
  scope: ConsumerAppScope,
): readonly TCookieKey[] {
  const keys = getConsumerScopeCookieKeys(scope);
  return [keys.oauthState, keys.localOauthState];
}

export function getScopedConsumerDeviceCookieKeysForRead(scope: ConsumerAppScope): readonly TCookieKey[] {
  const keys = getConsumerScopeCookieKeys(scope);
  return [keys.deviceId, keys.localDeviceId];
}

export function getScopedConsumerGoogleSignupSessionCookieKeysForRead(
  scope: ConsumerAppScope,
): readonly TCookieKey[] {
  const keys = getConsumerScopeCookieKeys(scope);
  return [keys.googleSignupSession, keys.localGoogleSignupSession];
}

function getConsumerAccessTokenCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerAccessTokenCookieKey(CURRENT_CONSUMER_APP_SCOPE, runtime);
}

function getConsumerDeviceCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerDeviceCookieKey(CURRENT_CONSUMER_APP_SCOPE, runtime);
}

function getConsumerGoogleSignupSessionCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerGoogleSignupSessionCookieKey(CURRENT_CONSUMER_APP_SCOPE, runtime);
}

function getConsumerDeviceCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerDeviceCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
}

function getConsumerGoogleSignupSessionCookieKeysForRead(): readonly TCookieKey[] {
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

function getConsumerRefreshTokenCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerRefreshTokenCookieKey(CURRENT_CONSUMER_APP_SCOPE, runtime);
}

function getConsumerAccessTokenCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerAccessTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
}

function getConsumerRefreshTokenCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerRefreshTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
}

export function getApiV2ConsumerAccessTokenCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerAccessTokenCookieKey(CURRENT_CONSUMER_APP_SCOPE, runtime);
}

export function getApiV2ConsumerRefreshTokenCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerRefreshTokenCookieKey(CURRENT_CONSUMER_APP_SCOPE, runtime);
}

function getApiV2ConsumerDeviceCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerDeviceCookieKey(CURRENT_CONSUMER_APP_SCOPE, runtime);
}

function getApiV2ConsumerGoogleSignupSessionCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerGoogleSignupSessionCookieKey(CURRENT_CONSUMER_APP_SCOPE, runtime);
}

export function getApiV2ConsumerAccessTokenCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerAccessTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
}

export function getApiV2ConsumerRefreshTokenCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerRefreshTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
}

export function getApiV2ConsumerDeviceCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerDeviceCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
}

export function getApiV2ConsumerGoogleSignupSessionCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerGoogleSignupSessionCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
}

function getConsumerCsrfTokenCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerCsrfTokenCookieKey(CURRENT_CONSUMER_APP_SCOPE, runtime);
}

function getConsumerCsrfTokenCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerCsrfTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
}

export function getApiV2ConsumerCsrfTokenCookieKeyForRuntime(runtime: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerCsrfTokenCookieKey(CURRENT_CONSUMER_APP_SCOPE, runtime);
}

export function getApiV2ConsumerCsrfTokenCookieKey(runtime?: ConsumerCookieRuntime): TCookieKey {
  if (!runtime) {
    return COOKIE_KEYS.API_V2_CSRF_TOKEN;
  }
  return getApiV2ConsumerCsrfTokenCookieKeyForRuntime(runtime);
}

export function getApiV2ConsumerCsrfTokenCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerCsrfTokenCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
}

function getGoogleOAuthStateCookieKey(runtime?: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerGoogleOAuthStateCookieKey(CURRENT_CONSUMER_APP_SCOPE, runtime);
}

function getGoogleOAuthStateCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerGoogleOAuthStateCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
}

export function getApiV2GoogleOAuthStateCookieKey(runtime?: ConsumerCookieRuntime): TCookieKey {
  return getScopedConsumerGoogleOAuthStateCookieKey(CURRENT_CONSUMER_APP_SCOPE, runtime);
}

export function getApiV2GoogleOAuthStateCookieKeysForRead(): readonly TCookieKey[] {
  return getScopedConsumerGoogleOAuthStateCookieKeysForRead(CURRENT_CONSUMER_APP_SCOPE);
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

function resolveAccessTokenCookieKeysForPath(
  path: string,
  consumerScope: ConsumerAppScope = CURRENT_CONSUMER_APP_SCOPE,
): readonly TCookieKey[] {
  if (isAdminApiPath(path)) return getAdminAccessTokenCookieKeysForRead();
  if (path.startsWith(CONSUMER_API_PATH_PREFIX)) return getScopedConsumerAccessTokenCookieKeysForRead(consumerScope);
  return getScopedConsumerAccessTokenCookieKeysForRead(consumerScope);
}
