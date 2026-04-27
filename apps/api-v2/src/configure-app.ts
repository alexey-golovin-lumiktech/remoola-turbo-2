import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import helmet from 'helmet';

import { isAdminApiPath, CONSUMER_APP_SCOPE_HEADER } from '@remoola/api-types';

import { AdminV2Module } from './admin-v2/admin-v2.module';
import {
  ConsumerActionInterceptor,
  CorrelationIdMiddleware,
  deviceIdMiddleware,
  LoggingInterceptor,
  PrismaExceptionFilter,
} from './common';
import { ConsumerModule } from './consumer/consumer.module';
import { envs } from './envs';
import { AuthGuard } from './guards';
import { TransformResponseInterceptor } from './interceptors';
import { ConsumerActionLogService } from './shared/consumer-action-log.service';
import { OriginResolverService } from './shared/origin-resolver.service';
import { PrismaService } from './shared/prisma.service';
import {
  buildSwaggerCookieAuthDocumentConfig,
  buildSwaggerCookieAuthScript,
  swaggerCookieAuthCustomCss,
} from './swagger-cookie-auth';

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

function linkTo(kind: `Consumer` | `Admin`): string {
  const lookup = {
    Consumer: `/docs/consumer`,
    Admin: `/docs/admin`,
  };

  return `<a rel="noopener noreferrer" target="_self" href="${lookup[kind]}" style="color:#93c5fd">(${kind} api)</a>`;
}

const swaggerUiBaseOptions = {
  customfavIcon: `https://avatars.githubusercontent.com/u/6936373?s=200&v=4`,
  customJs: [
    `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui-bundle.js`,
    `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui-standalone-preset.js`,
  ],
  customCssUrl: [`https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui.css`],
  customCss: swaggerCookieAuthCustomCss,
  swaggerOptions: {
    withCredentials: true,
  },
};

function setupSwagger(app: INestApplication): void {
  const adminConfig = buildSwaggerCookieAuthDocumentConfig(`admin`, linkTo(`Consumer`));

  const adminDocument = SwaggerModule.createDocument(app, adminConfig, {
    include: [AdminV2Module],
    deepScanRoutes: true,
  });

  SwaggerModule.setup(`docs/admin`, app, adminDocument, {
    ...swaggerUiBaseOptions,
    customJsStr: buildSwaggerCookieAuthScript(`admin`),
    jsonDocumentUrl: `docs/admin-api-json`,
  });

  const consumerConfig = buildSwaggerCookieAuthDocumentConfig(`consumer`, linkTo(`Admin`));

  const consumerDocument = SwaggerModule.createDocument(app, consumerConfig, {
    include: [ConsumerModule],
    deepScanRoutes: true,
  });

  SwaggerModule.setup(`docs/consumer`, app, consumerDocument, {
    ...swaggerUiBaseOptions,
    customJsStr: buildSwaggerCookieAuthScript(`consumer`),
    jsonDocumentUrl: `docs/consumer-api-json`,
  });
}

function appendVaryOrigin(res: express.Response): void {
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

function registerScopedCors(app: NestExpressApplication, originResolver: OriginResolverService): void {
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
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

export function configureApp(app: NestExpressApplication, originResolver = new OriginResolverService()): void {
  app.enableShutdownHooks();
  app.setGlobalPrefix(`api`);
  app.set(`trust proxy`, 1);
  app.set(`query parser`, `extended`);
  registerScopedCors(app, originResolver);

  app.use((req, res, next) => {
    const isSwaggerRoute = envs.SWAGGER_ENABLED && req.path.startsWith(`/docs`);

    if (isSwaggerRoute) {
      return helmet({ contentSecurityPolicy: false })(req, res, next);
    }

    return helmet()(req, res, next);
  });

  app.use(compression());
  app.use(new CorrelationIdMiddleware().use);

  app.use(`/api/consumer/webhooks`, express.raw({ type: `application/json`, limit: `10mb` }));
  app.use(`/api/consumer/webhook`, express.raw({ type: `application/json`, limit: `10mb` }));

  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith(`/api/consumer/webhooks`) || req.path.startsWith(`/api/consumer/webhook`)) {
      return next();
    }

    return express.json({ limit: `10mb` })(req, res, next);
  });

  app.use(express.urlencoded({ extended: true, limit: `10mb` }));
  app.use(cookieParser(envs.SECURE_SESSION_SECRET));
  app.use(deviceIdMiddleware);

  app.use((req, res, next) => {
    if (envs.SWAGGER_ENABLED && (req.path === `/` || req.path === `/api`)) {
      return res.redirect(`/docs/consumer`);
    }

    return next();
  });

  if (envs.SWAGGER_ENABLED) {
    setupSwagger(app);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      skipMissingProperties: true,
      skipNullProperties: true,
      skipUndefinedProperties: true,
      stopAtFirstError: true,
      transform: true,
      transformOptions: {
        excludeExtraneousValues: true,
        exposeUnsetFields: false,
        enableImplicitConversion: true,
        exposeDefaultValues: false,
      },
    }),
  );

  const reflector = app.get(Reflector);
  const jwtService = app.get(JwtService);
  const prisma = app.get(PrismaService);
  const consumerActionLog = app.get(ConsumerActionLogService);

  app.useGlobalGuards(new AuthGuard(reflector, jwtService, prisma));

  app.useGlobalInterceptors(
    new TransformResponseInterceptor(reflector),
    new LoggingInterceptor(),
    new ConsumerActionInterceptor(consumerActionLog, reflector),
  );

  app.useGlobalFilters(new PrismaExceptionFilter());
}
