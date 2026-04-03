import { Logger, ValidationPipe, type INestApplication } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import helmet from 'helmet';

import { $Enums, type PrismaClient } from '@remoola/database-2';

import { AdminModule } from './admin/admin.module';
import { AppModule } from './app.module';
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
import { NgrokIngressService } from './infrastructure/ngrok/ngrok-ingress.service';
import { TransformResponseInterceptor } from './interceptors';
import { ConsumerActionLogService } from './shared/consumer-action-log.service';
import { OriginResolverService } from './shared/origin-resolver.service';
import { PrismaService } from './shared/prisma.service';
import { passwordUtils } from './shared-common';
import {
  buildSwaggerCookieAuthDocumentConfig,
  buildSwaggerCookieAuthScript,
  swaggerCookieAuthCustomCss,
} from './swagger-cookie-auth';

const logger = new Logger(`Bootstrap`);

const DB_CONNECT_MAX_ATTEMPTS = 30;
const DB_CONNECT_DELAY_MS = 500;
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
].join(`,`);
const CORS_EXPOSED_HEADERS = `set-cookie,content-range,content-type`;

let isShuttingDown = false;

async function waitForDatabase(prisma: PrismaClient): Promise<void> {
  for (let attempt = 1; attempt <= DB_CONNECT_MAX_ATTEMPTS; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;

      if (attempt > 1) {
        logger.log(`Database ready after ${attempt} attempt(s)`);
      }

      return;
    } catch (error) {
      if (attempt === DB_CONNECT_MAX_ATTEMPTS) {
        throw error;
      }

      logger.warn(
        `Database not ready (attempt ${attempt}/${DB_CONNECT_MAX_ATTEMPTS}), retrying in ${DB_CONNECT_DELAY_MS}ms...`,
      );

      await new Promise((resolve) => setTimeout(resolve, DB_CONNECT_DELAY_MS));
    }
  }
}

async function seed(prisma: PrismaClient): Promise<void> {
  const admins = [
    {
      type: $Enums.AdminType.ADMIN,
      email: envs.DEFAULT_ADMIN_EMAIL,
      password: envs.DEFAULT_ADMIN_PASSWORD,
    },
    {
      type: $Enums.AdminType.SUPER,
      email: envs.SUPER_ADMIN_EMAIL,
      password: envs.SUPER_ADMIN_PASSWORD,
    },
  ];

  for (const admin of admins) {
    const dbAdmin = await prisma.adminModel.findFirst({
      where: { email: admin.email },
    });

    if (!dbAdmin) {
      const { salt, hash } = await passwordUtils.hashPassword(admin.password);

      await prisma.adminModel.create({
        data: {
          email: admin.email,
          password: hash,
          salt,
          type: admin.type,
        },
      });

      continue;
    }

    const validPassword = await passwordUtils.verifyPassword({
      password: admin.password,
      storedHash: dbAdmin.password,
      storedSalt: dbAdmin.salt,
    });

    if (validPassword && dbAdmin.type === admin.type) {
      continue;
    }

    const nextData: {
      type?: $Enums.AdminType;
      password?: string;
      salt?: string;
    } = {};

    if (dbAdmin.type !== admin.type) {
      nextData.type = admin.type;
    }

    if (!validPassword) {
      const { salt, hash } = await passwordUtils.hashPassword(admin.password);
      nextData.password = hash;
      nextData.salt = salt;
    }

    await prisma.adminModel.update({
      where: { id: dbAdmin.id },
      data: nextData,
    });
  }

  const lookup = [
    { fromCurrency: $Enums.CurrencyCode.USD, toCurrency: $Enums.CurrencyCode.EUR, rate: 0.95 },
    { fromCurrency: $Enums.CurrencyCode.USD, toCurrency: $Enums.CurrencyCode.JPY, rate: 1.0576 },
    { fromCurrency: $Enums.CurrencyCode.USD, toCurrency: $Enums.CurrencyCode.GBP, rate: 0.82 },
    { fromCurrency: $Enums.CurrencyCode.USD, toCurrency: $Enums.CurrencyCode.AUD, rate: 1.58 },
    { fromCurrency: $Enums.CurrencyCode.EUR, toCurrency: $Enums.CurrencyCode.USD, rate: 1.0576 },
    { fromCurrency: $Enums.CurrencyCode.EUR, toCurrency: $Enums.CurrencyCode.JPY, rate: 0.8582 },
    { fromCurrency: $Enums.CurrencyCode.EUR, toCurrency: $Enums.CurrencyCode.GBP, rate: 0.8427 },
    { fromCurrency: $Enums.CurrencyCode.EUR, toCurrency: $Enums.CurrencyCode.AUD, rate: 0.9398 },
    { fromCurrency: $Enums.CurrencyCode.JPY, toCurrency: $Enums.CurrencyCode.USD, rate: 0.0067 },
    { fromCurrency: $Enums.CurrencyCode.JPY, toCurrency: $Enums.CurrencyCode.EUR, rate: 0.0063 },
    { fromCurrency: $Enums.CurrencyCode.JPY, toCurrency: $Enums.CurrencyCode.GBP, rate: 0.4798 },
    { fromCurrency: $Enums.CurrencyCode.JPY, toCurrency: $Enums.CurrencyCode.AUD, rate: 0.3871 },
    { fromCurrency: $Enums.CurrencyCode.GBP, toCurrency: $Enums.CurrencyCode.USD, rate: 1.22 },
    { fromCurrency: $Enums.CurrencyCode.GBP, toCurrency: $Enums.CurrencyCode.EUR, rate: 1.15 },
    { fromCurrency: $Enums.CurrencyCode.GBP, toCurrency: $Enums.CurrencyCode.JPY, rate: 182.34 },
    { fromCurrency: $Enums.CurrencyCode.GBP, toCurrency: $Enums.CurrencyCode.AUD, rate: 0.4087 },
    { fromCurrency: $Enums.CurrencyCode.AUD, toCurrency: $Enums.CurrencyCode.USD, rate: 0.63 },
    { fromCurrency: $Enums.CurrencyCode.AUD, toCurrency: $Enums.CurrencyCode.JPY, rate: 94.56 },
    { fromCurrency: $Enums.CurrencyCode.AUD, toCurrency: $Enums.CurrencyCode.EUR, rate: 0.59 },
    { fromCurrency: $Enums.CurrencyCode.AUD, toCurrency: $Enums.CurrencyCode.GBP, rate: 0.52 },
  ];

  const existingExchangeRates = await prisma.exchangeRateModel.count();
  if (existingExchangeRates === 0) {
    await prisma.exchangeRateModel.createMany({
      data: lookup,
      skipDuplicates: true,
    });
  }
}

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
    include: [AdminModule],
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
  if (path.startsWith(`/api/admin/`) || path.startsWith(`/docs/admin`)) {
    return originResolver.validateAdminOrigin(originHeader);
  }
  if (path.startsWith(`/api/consumer/`) || path.startsWith(`/docs/consumer`)) {
    return originResolver.validateConsumerRedirectOrigin(originHeader);
  }
  return (
    originResolver.validateAdminOrigin(originHeader) ?? originResolver.validateConsumerRedirectOrigin(originHeader)
  );
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

function registerProcessHandlers(app: INestApplication): void {
  const shutdown = async (signal: string, exitCode = 0): Promise<void> => {
    if (isShuttingDown) {
      logger.warn(`Shutdown already in progress, ignoring ${signal}`);
      return;
    }

    isShuttingDown = true;
    logger.warn(`Received ${signal}, starting graceful shutdown`);

    const forceExitTimer = setTimeout(() => {
      logger.error(`Forced shutdown after timeout`);
      process.exit(1);
    }, 10_000);

    try {
      await app.close();
      clearTimeout(forceExitTimer);
      logger.log(`Graceful shutdown complete`);
      process.exit(exitCode);
    } catch (error) {
      clearTimeout(forceExitTimer);
      logger.error(`Graceful shutdown failed`, error instanceof Error ? error.stack : String(error));
      process.exit(1);
    }
  };

  process.on(`SIGINT`, () => {
    void shutdown(`SIGINT`);
  });

  process.on(`SIGTERM`, () => {
    void shutdown(`SIGTERM`);
  });

  process.on(`unhandledRejection`, (error: unknown) => {
    const err = error as { code?: string };

    if (err?.code === `ERR_HTTP_HEADERS_SENT`) {
      logger.warn(`Unhandled rejection ignored: ERR_HTTP_HEADERS_SENT`);
      return;
    }

    logger.error(`Unhandled rejection`, error instanceof Error ? error.stack : String(error));
    void shutdown(`unhandledRejection`, 1);
  });

  process.on(`uncaughtException`, (error: Error) => {
    logger.error(`Uncaught exception`, error.stack);
    void shutdown(`uncaughtException`, 1);
  });
}

async function bootstrap(): Promise<INestApplication> {
  logger.log(`BOOT PID=${process.pid}`);
  logger.log(`BOOT TIME=${new Date().toISOString()}`);

  const isOnVercel = envs.VERCEL === 1;
  const originResolver = new OriginResolverService();

  if (isOnVercel) {
    process.env.NO_COLOR = `true`;
    logger.warn(`VERCEL=1 detected. This bootstrap is designed for a persistent Node server.`);
  }

  if (envs.CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK) {
    logger.warn(
      `
        CONSUMER_OAUTH_ALLOW_MISSING_STATE_COOKIE_FALLBACK
        is enabled;
        restrict to controlled non-production debugging only
      `,
    );
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

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

  await waitForDatabase(prisma);

  const shouldRunBootstrapSeed = !envs.isProductionLike || envs.ALLOW_PRODUCTION_BOOTSTRAP_SEED;

  if (shouldRunBootstrapSeed) {
    await seed(prisma);
  } else {
    logger.log(`Skipping bootstrap seed in production-like runtime (ALLOW_PRODUCTION_BOOTSTRAP_SEED=false)`);
  }

  app.useGlobalGuards(new AuthGuard(reflector, jwtService, prisma));

  app.useGlobalInterceptors(
    new TransformResponseInterceptor(reflector),
    new LoggingInterceptor(),
    new ConsumerActionInterceptor(consumerActionLog, reflector),
  );

  app.useGlobalFilters(new PrismaExceptionFilter());

  const port = envs.PORT || 3000;
  await app.listen(port);

  const appUrl = await app.getUrl();

  logger.log(`🚀 API running on ${appUrl}/api`);
  if (envs.SWAGGER_ENABLED) {
    logger.log(`📘 Admin Docs → ${appUrl}/docs/admin`);
    logger.log(`📗 Consumer Docs → ${appUrl}/docs/consumer`);
  }

  if (!isOnVercel && envs.NGROK_ENABLED) {
    const ngrokService = app.get(NgrokIngressService);

    await ngrokService.startIfEnabled({
      port,
      authtoken: envs.NGROK_AUTH_TOKEN,
      domain: envs.NGROK_DOMAIN,
    });
  }

  registerProcessHandlers(app);

  return app;
}

void bootstrap().catch((error: unknown) => {
  logger.error(`Bootstrap error: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
  process.exit(1);
});
