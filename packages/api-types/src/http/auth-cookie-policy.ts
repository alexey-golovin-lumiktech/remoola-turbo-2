import { COOKIE_KEYS, type TCookieKey } from './constants';

/** Max age for device cookie in seconds (e.g. 365 days). */
export const DEVICE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

const ROOT_COOKIE_PATH = `/` as const;
const ADMIN_API_PATH_PREFIX = `/api/admin/`;
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

function shouldUseLocalConsumerCookieFallback(runtime: ConsumerCookieRuntime): boolean {
  return !(runtime.isVercel || runtime.isProduction || runtime.cookieSecure || runtime.isSecureRequest);
}

function selectConsumerCookieKey(
  runtime: ConsumerCookieRuntime,
  secureKey: TCookieKey,
  localKey: TCookieKey,
): TCookieKey {
  return shouldUseLocalConsumerCookieFallback(runtime) ? localKey : secureKey;
}

export function getConsumerAccessTokenCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return selectConsumerCookieKey(runtime, COOKIE_KEYS.CONSUMER_ACCESS_TOKEN, COOKIE_KEYS.LOCAL_CONSUMER_ACCESS_TOKEN);
}

export function getConsumerDeviceCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return selectConsumerCookieKey(runtime, COOKIE_KEYS.CONSUMER_DEVICE_ID, COOKIE_KEYS.LOCAL_CONSUMER_DEVICE_ID);
}

export function getConsumerDeviceCookieKeysForRead(): readonly TCookieKey[] {
  return [COOKIE_KEYS.CONSUMER_DEVICE_ID, COOKIE_KEYS.LOCAL_CONSUMER_DEVICE_ID];
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
  return selectConsumerCookieKey(runtime, COOKIE_KEYS.CONSUMER_REFRESH_TOKEN, COOKIE_KEYS.LOCAL_CONSUMER_REFRESH_TOKEN);
}

export function getConsumerAccessTokenCookieKeysForRead(): readonly TCookieKey[] {
  return [COOKIE_KEYS.CONSUMER_ACCESS_TOKEN, COOKIE_KEYS.LOCAL_CONSUMER_ACCESS_TOKEN];
}

export function getConsumerRefreshTokenCookieKeysForRead(): readonly TCookieKey[] {
  return [COOKIE_KEYS.CONSUMER_REFRESH_TOKEN, COOKIE_KEYS.LOCAL_CONSUMER_REFRESH_TOKEN];
}

export function getApiV2ConsumerAccessTokenCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return selectConsumerCookieKey(
    runtime,
    COOKIE_KEYS.API_V2_CONSUMER_ACCESS_TOKEN,
    COOKIE_KEYS.LOCAL_API_V2_CONSUMER_ACCESS_TOKEN,
  );
}

export function getApiV2ConsumerRefreshTokenCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return selectConsumerCookieKey(
    runtime,
    COOKIE_KEYS.API_V2_CONSUMER_REFRESH_TOKEN,
    COOKIE_KEYS.LOCAL_API_V2_CONSUMER_REFRESH_TOKEN,
  );
}

export function getApiV2ConsumerDeviceCookieKey(runtime: ConsumerCookieRuntime): TCookieKey {
  return selectConsumerCookieKey(
    runtime,
    COOKIE_KEYS.API_V2_CONSUMER_DEVICE_ID,
    COOKIE_KEYS.LOCAL_API_V2_CONSUMER_DEVICE_ID,
  );
}

export function getApiV2ConsumerAccessTokenCookieKeysForRead(): readonly TCookieKey[] {
  return [COOKIE_KEYS.API_V2_CONSUMER_ACCESS_TOKEN, COOKIE_KEYS.LOCAL_API_V2_CONSUMER_ACCESS_TOKEN];
}

export function getApiV2ConsumerRefreshTokenCookieKeysForRead(): readonly TCookieKey[] {
  return [COOKIE_KEYS.API_V2_CONSUMER_REFRESH_TOKEN, COOKIE_KEYS.LOCAL_API_V2_CONSUMER_REFRESH_TOKEN];
}

export function getApiV2ConsumerDeviceCookieKeysForRead(): readonly TCookieKey[] {
  return [COOKIE_KEYS.API_V2_CONSUMER_DEVICE_ID, COOKIE_KEYS.LOCAL_API_V2_CONSUMER_DEVICE_ID];
}

export function getApiV2ConsumerCsrfTokenCookieKey(): TCookieKey {
  return COOKIE_KEYS.API_V2_CSRF_TOKEN;
}

export function getApiV2GoogleOAuthStateCookieKey(): TCookieKey {
  return COOKIE_KEYS.API_V2_GOOGLE_OAUTH_STATE;
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

export function resolveAccessTokenCookieKeyForPath(path: string): TCookieKey {
  if (path.startsWith(ADMIN_API_PATH_PREFIX)) return COOKIE_KEYS.ADMIN_ACCESS_TOKEN;
  if (path.startsWith(CONSUMER_API_PATH_PREFIX)) return COOKIE_KEYS.CONSUMER_ACCESS_TOKEN;
  return COOKIE_KEYS.CONSUMER_ACCESS_TOKEN;
}

export function resolveAccessTokenCookieKeysForPath(path: string): readonly TCookieKey[] {
  if (path.startsWith(ADMIN_API_PATH_PREFIX)) return [COOKIE_KEYS.ADMIN_ACCESS_TOKEN];
  if (path.startsWith(CONSUMER_API_PATH_PREFIX)) return getConsumerAccessTokenCookieKeysForRead();
  return getConsumerAccessTokenCookieKeysForRead();
}
