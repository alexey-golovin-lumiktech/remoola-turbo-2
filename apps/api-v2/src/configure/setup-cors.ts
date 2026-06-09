import { type NestExpressApplication } from '@nestjs/platform-express';
import { type Response } from 'express';

import { CONSUMER_APP_SCOPE_HEADER, isAdminApiPath } from '@remoola/api-types';

import { type OriginResolverService } from '../shared/origin-resolver.service';

const CORS_ALLOWED_METHODS = `GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS`;
const CORS_ALLOWED_HEADERS = [
  `Origin`,
  `Content-Type`,
  `Accept`,
  `Cookie`,
  `X-CSRF-Token`,
  `X-Correlation-Id`,
  `X-Request-Id`,
  `Idempotency-Key`,
  CONSUMER_APP_SCOPE_HEADER,
].join(`,`);
const CORS_EXPOSED_HEADERS = `set-cookie,content-range,content-type`;

function appendVaryOrigin(res: Response): void {
  const current = res.getHeader(`Vary`);
  if (typeof current !== `string` || current.length === 0) {
    res.setHeader(`Vary`, `Origin`);
    return;
  }
  if (
    !current
      .split(`,`)
      .map((value) => value.trim())
      .includes(`Origin`)
  ) {
    res.setHeader(`Vary`, `${current}, Origin`);
  }
}

function resolveAllowedOriginForPath(
  originResolver: OriginResolverService,
  path: string,
  originHeader: string,
): string | undefined {
  if (isAdminApiPath(path) || path.startsWith(`/docs/admin`)) {
    return originResolver.validateAdminOrigin(originHeader);
  }
  if (path.startsWith(`/api/consumer/`) || path.startsWith(`/docs/consumer`)) {
    return originResolver.validateConsumerCorsOrigin(originHeader);
  }
  return originResolver.validateAdminOrigin(originHeader) ?? originResolver.validateConsumerCorsOrigin(originHeader);
}

export function registerScopedCors(app: NestExpressApplication, originResolver: OriginResolverService): void {
  app.use((req, res, next) => {
    const originHeader = typeof req.headers.origin === `string` ? req.headers.origin.trim() : undefined;
    if (!originHeader) {
      if (req.method === `OPTIONS`) {
        res.setHeader(`Access-Control-Allow-Methods`, CORS_ALLOWED_METHODS);
        res.setHeader(`Access-Control-Allow-Headers`, CORS_ALLOWED_HEADERS);
        res.setHeader(`Access-Control-Allow-Credentials`, `true`);
        res.setHeader(`Access-Control-Expose-Headers`, CORS_EXPOSED_HEADERS);
        return res.status(204).end();
      }
      return next();
    }

    const allowedOrigin = resolveAllowedOriginForPath(originResolver, req.path, originHeader);
    if (!allowedOrigin) {
      return res.status(403).send(`CORS origin denied`);
    }

    appendVaryOrigin(res);
    res.setHeader(`Access-Control-Allow-Origin`, allowedOrigin);
    res.setHeader(`Access-Control-Allow-Credentials`, `true`);
    res.setHeader(`Access-Control-Allow-Methods`, CORS_ALLOWED_METHODS);
    res.setHeader(`Access-Control-Allow-Headers`, CORS_ALLOWED_HEADERS);
    res.setHeader(`Access-Control-Expose-Headers`, CORS_EXPOSED_HEADERS);
    if (req.method === `OPTIONS`) {
      return res.status(204).end();
    }
    return next();
  });
}
