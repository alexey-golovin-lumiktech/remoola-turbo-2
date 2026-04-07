import { randomUUID } from 'crypto';

import { UnauthorizedException } from '@nestjs/common';
import { type Request, type Response, type NextFunction } from 'express';

import { CONSUMER_APP_SCOPE_HEADER } from '@remoola/api-types';

import { OriginResolverService } from '../../shared/origin-resolver.service';
import {
  getApiConsumerDeviceCookieKey,
  getApiConsumerDeviceCookieKeysForRead,
  getApiConsumerDeviceCookieOptions,
} from '../../shared-common/auth-cookie-policy';

const CONSUMER_API_PATH_PREFIX = `/api/consumer`;
const originResolver = new OriginResolverService();
const PUBLIC_CONSUMER_ROUTES_WITHOUT_SCOPE_HEADER = new Set([
  `/api/consumer/auth/google/start`,
  `/api/consumer/auth/google/callback`,
  `/api/consumer/auth/forgot-password/verify`,
  `/api/consumer/auth/signup/verification`,
]);

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
): { value: string | null; key: string | null } {
  for (const key of keys) {
    const signedValue = req.signedCookies?.[key];
    if (isValidDeviceId(signedValue)) {
      return { value: signedValue, key };
    }
  }

  return { value: null, key: null };
}

function isConsumerApiPath(path: string | undefined): boolean {
  if (!path) return false;
  return path === CONSUMER_API_PATH_PREFIX || path.startsWith(`${CONSUMER_API_PATH_PREFIX}/`);
}

function shouldSkipScopedDeviceId(req: RequestWithDeviceId): boolean {
  if (req.method?.toUpperCase() !== `GET`) return false;
  const path = req.path ?? req.url?.split(`?`)[0];
  return typeof path === `string` && PUBLIC_CONSUMER_ROUTES_WITHOUT_SCOPE_HEADER.has(path);
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
  if (shouldSkipScopedDeviceId(req)) {
    return next();
  }

  const consumerScope = originResolver.validateConsumerAppScopeHeader(req.headers?.[CONSUMER_APP_SCOPE_HEADER]);
  if (!consumerScope) {
    return next(new UnauthorizedException(`Invalid app scope`));
  }
  const keys = getApiConsumerDeviceCookieKeysForRead(consumerScope);
  const existing = readFirstValidDeviceId(req, keys);
  let deviceId: string;

  if (existing.value) {
    deviceId = existing.value;
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
