import { randomUUID } from 'crypto';

import { Logger } from '@nestjs/common';
import { type Request, type Response, type NextFunction } from 'express';

import { envs } from '../../envs';
import { OriginResolverService } from '../../shared/origin-resolver.service';
import {
  DEFAULT_API_V2_CONSUMER_SCOPE,
  getApiConsumerDeviceCookieKey,
  getApiConsumerDeviceCookieKeysForRead,
  getApiConsumerDeviceCookieOptions,
} from '../../shared-common/auth-cookie-policy';

const CONSUMER_API_PATH_PREFIX = `/api/consumer`;
const UNSIGNED_FALLBACK_LOG_WINDOW_MS = 60000;
const unsignedFallbackLogger = new Logger(`DeviceIdMiddleware`);
let unsignedFallbackWindowStartedAtMs = Date.now();
let unsignedFallbackSeenInWindow = 0;
let productionUnsignedFallbackWarningEmitted = false;
const originResolver = new OriginResolverService();

export interface RequestWithDeviceId extends Request {
  deviceId?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidDeviceId(value: unknown): value is string {
  return typeof value === `string` && value.length > 0 && UUID_REGEX.test(value);
}

function readFirstValidDeviceId(
  req: RequestWithDeviceId,
  keys: readonly string[],
): { value: string | null; fromUnsigned: boolean; key: string | null } {
  for (const key of keys) {
    const signedValue = req.signedCookies?.[key];
    if (isValidDeviceId(signedValue)) {
      return { value: signedValue, fromUnsigned: false, key };
    }

    const unsignedValue = req.cookies?.[key];
    if (isValidDeviceId(unsignedValue)) {
      return { value: unsignedValue, fromUnsigned: true, key };
    }
  }

  return { value: null, fromUnsigned: false, key: null };
}

function noteUnsignedFallbackUsage(): void {
  const nowMs = Date.now();
  if (nowMs - unsignedFallbackWindowStartedAtMs >= UNSIGNED_FALLBACK_LOG_WINDOW_MS) {
    if (unsignedFallbackSeenInWindow > 0) {
      unsignedFallbackLogger.warn({
        event: `consumer_device_id_unsigned_fallback_seen`,
        count: unsignedFallbackSeenInWindow,
        windowSeconds: UNSIGNED_FALLBACK_LOG_WINDOW_MS / 1000,
      });
    }
    unsignedFallbackWindowStartedAtMs = nowMs;
    unsignedFallbackSeenInWindow = 0;
  }
  unsignedFallbackSeenInWindow += 1;
}

function canUseUnsignedFallback(): boolean {
  if (!envs.CONSUMER_DEVICE_ID_ALLOW_UNSIGNED_FALLBACK) {
    return false;
  }
  if (envs.NODE_ENV === envs.ENVIRONMENT.PRODUCTION) {
    if (!productionUnsignedFallbackWarningEmitted) {
      unsignedFallbackLogger.warn({
        event: `consumer_device_id_unsigned_fallback_ignored_in_production`,
      });
      productionUnsignedFallbackWarningEmitted = true;
    }
    return false;
  }
  return true;
}

function isConsumerApiPath(path: string | undefined): boolean {
  if (!path) return false;
  return path === CONSUMER_API_PATH_PREFIX || path.startsWith(`${CONSUMER_API_PATH_PREFIX}/`);
}

/**
 * Middleware: for consumer API paths only, ensure req.deviceId is set.
 * Reads device cookie; if missing/invalid, generates a UUID and sets the cookie.
 * Cookie write failures are ignored (request continues).
 */
export function deviceIdMiddleware(req: RequestWithDeviceId, res: Response, next: NextFunction): void {
  if (!isConsumerApiPath(req.path)) {
    return next();
  }

  const consumerScope =
    originResolver.resolveConsumerRequestAppScope?.(req.headers?.origin, req.headers?.referer) ??
    DEFAULT_API_V2_CONSUMER_SCOPE;
  const keys = getApiConsumerDeviceCookieKeysForRead(consumerScope);
  const existing = readFirstValidDeviceId(req, keys);
  const isLocalCookieKey = typeof existing.key === `string` && !existing.key.startsWith(`__Host-`);
  let deviceId: string;

  if (existing.value && !existing.fromUnsigned) {
    deviceId = existing.value;
  } else if (existing.value && existing.fromUnsigned && isLocalCookieKey && canUseUnsignedFallback()) {
    // TODO(2026-04-30): Remove unsigned fallback after signed cookie migration window ends.
    // Migration fallback: accept legacy unsigned value and rotate into signed cookie.
    noteUnsignedFallbackUsage();
    deviceId = existing.value;
    try {
      const options = getApiConsumerDeviceCookieOptions(req);
      res.cookie(getApiConsumerDeviceCookieKey(req, consumerScope), deviceId, { ...options, signed: true });
    } catch {
      // Cookie set failed (e.g. headers sent); continue without throwing
    }
  } else {
    deviceId = randomUUID();
    try {
      const options = getApiConsumerDeviceCookieOptions(req);
      res.cookie(getApiConsumerDeviceCookieKey(req, consumerScope), deviceId, { ...options, signed: true });
    } catch {
      // Cookie set failed (e.g. headers sent); continue without throwing
    }
  }

  req.deviceId = deviceId;
  next();
}
