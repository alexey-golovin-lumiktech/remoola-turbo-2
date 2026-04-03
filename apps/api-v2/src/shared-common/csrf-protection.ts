import { UnauthorizedException } from '@nestjs/common';
import { type Request as ExpressRequest } from 'express';

import {
  DEFAULT_API_V2_CONSUMER_SCOPE,
  getApiAdminCsrfTokenCookieKeysForRead,
  getApiConsumerCsrfTokenCookieKeysForRead,
} from './auth-cookie-policy';
import { type OriginResolverService } from '../shared/origin-resolver.service';

const ADMIN_API_PATH_PREFIX = `/api/admin/`;
const CONSUMER_API_PATH_PREFIX = `/api/consumer/`;
const MUTATION_METHODS = new Set([`POST`, `PUT`, `PATCH`, `DELETE`]);

function readHeaderValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === `string`) {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => entry.trim()).find((entry) => entry.length > 0);
  }
  return undefined;
}

function isProtectedApiPath(path: string): boolean {
  return path.startsWith(ADMIN_API_PATH_PREFIX) || path.startsWith(CONSUMER_API_PATH_PREFIX);
}

export function requiresAuthenticatedMutationCsrf(req: ExpressRequest): boolean {
  const method = req.method?.toUpperCase();
  const path = req.path ?? req.url?.split(`?`)[0] ?? ``;
  return Boolean(method && MUTATION_METHODS.has(method) && isProtectedApiPath(path));
}

export function ensureAuthenticatedMutationCsrf(req: ExpressRequest, originResolver: OriginResolverService): void {
  if (!requiresAuthenticatedMutationCsrf(req)) {
    return;
  }

  const path = req.path ?? req.url?.split(`?`)[0] ?? ``;
  if (!originResolver.resolveRequestOriginForPath(path, req.headers.origin, req.headers.referer)) {
    throw new UnauthorizedException(`Invalid request origin`);
  }

  const consumerScope =
    originResolver.resolveConsumerRequestAppScope?.(req.headers?.origin, req.headers?.referer) ??
    DEFAULT_API_V2_CONSUMER_SCOPE;
  const csrfHeaderValue = readHeaderValue(req.headers[`x-csrf-token`]);
  const csrfCookieValue = (
    path.startsWith(ADMIN_API_PATH_PREFIX)
      ? getApiAdminCsrfTokenCookieKeysForRead()
      : getApiConsumerCsrfTokenCookieKeysForRead(consumerScope)
  )
    .map((key) => readHeaderValue(req.cookies?.[key]))
    .find((value): value is string => typeof value === `string` && value.length > 0);
  if (!csrfHeaderValue || !csrfCookieValue || csrfHeaderValue !== csrfCookieValue) {
    throw new UnauthorizedException(`Invalid CSRF token`);
  }
}
