import { join } from 'path';

import { Logger, ValidationPipe, type INestApplication } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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
import { PrismaService } from './shared/prisma.service';
import { passwordUtils } from './shared-common';

const logger = new Logger(`Bootstrap`);

const DB_CONNECT_MAX_ATTEMPTS = 30;
const DB_CONNECT_DELAY_MS = 500;

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

  const emails = admins.map((admin) => admin.email);
  const dbAdmins = await prisma.adminModel.findMany({
    where: { email: { in: emails } },
  });

  for (const admin of admins) {
    if (dbAdmins.length === 0) {
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

    for (const dbAdmin of dbAdmins) {
      if (dbAdmin.email !== admin.email) {
        continue;
      }

      const valid = await passwordUtils.verifyPassword({
        password: admin.password,
        storedHash: dbAdmin.password,
        storedSalt: dbAdmin.salt,
      });

      if (valid) {
        continue;
      }

      const { salt, hash } = await passwordUtils.hashPassword(admin.password);

      await prisma.adminModel.update({
        where: { id: dbAdmin.id },
        data: { password: hash, salt },
      });
    }
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

  await prisma.exchangeRateModel.deleteMany({});
  await prisma.exchangeRateModel.createMany({
    data: lookup,
    skipDuplicates: true,
  });
}

function linkTo(kind: `Consumer` | `Admin`): string {
  const lookup = {
    Consumer: `/docs/consumer`,
    Admin: `/docs/admin`,
  };

  return `<a rel="noopener noreferrer" target="_self" href="${lookup[kind]}" style="color:#93c5fd">(${kind} api)</a>`;
}

const swaggerUiOptions = {
  customfavIcon: `https://avatars.githubusercontent.com/u/6936373?s=200&v=4`,
  customJs: [
    `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui-bundle.js`,
    `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui-bundle.min.js`,
    `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui-standalone-preset.js`,
    `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui-standalone-preset.min.js`,
  ],
  customCssUrl: [
    `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui.css`,
    `https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.1.3/swagger-ui.min.css`,
  ],
};

function setupSwagger(app: INestApplication): void {
  const adminConfig = new DocumentBuilder()
    .addBasicAuth({ type: `http`, scheme: `basic` }, `basic`)
    .addBearerAuth({ type: `http`, scheme: `bearer` }, `bearer`)
    .setTitle(`Remoola Admin API`)
    .setDescription(`Admin API ${linkTo(`Consumer`)}`)
    .setVersion(`1.0`)
    .build();

  const adminDocument = SwaggerModule.createDocument(app, adminConfig, {
    include: [AdminModule],
    deepScanRoutes: true,
  });

  SwaggerModule.setup(`docs/admin`, app, adminDocument, {
    ...swaggerUiOptions,
    jsonDocumentUrl: `docs/admin-api-json`,
  });

  const consumerConfig = new DocumentBuilder()
    .addBasicAuth({ type: `http`, scheme: `basic` }, `basic`)
    .addBearerAuth({ type: `http`, scheme: `bearer` }, `bearer`)
    .setTitle(`Remoola Consumer API`)
    .setDescription(`Consumer API ${linkTo(`Admin`)}`)
    .setVersion(`1.0`)
    .build();

  const consumerDocument = SwaggerModule.createDocument(app, consumerConfig, {
    include: [ConsumerModule],
    deepScanRoutes: true,
  });

  SwaggerModule.setup(`docs/consumer`, app, consumerDocument, {
    ...swaggerUiOptions,
    jsonDocumentUrl: `docs/consumer-api-json`,
  });
}

function buildAllowedOrigins(): Set<string> {
  return new Set(
    [
      envs.CONSUMER_APP_ORIGIN,
      envs.CONSUMER_MOBILE_APP_ORIGIN,
      envs.ADMIN_APP_ORIGIN,
      envs.NEST_APP_EXTERNAL_ORIGIN?.replace(/\/api\/?$/, ``),
      ...(envs.CORS_ALLOWED_ORIGINS || []),
    ]
      .filter(Boolean)
      .map((value) => String(value).replace(/\/$/, ``)),
  );
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
  const allowedOrigins = buildAllowedOrigins();

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
    cors: {
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }

        const normalized = origin.replace(/\/$/, ``);

        if (allowedOrigins.has(normalized)) {
          callback(null, true);
          return;
        }

        callback(new Error(`CORS origin denied`), false);
      },
      credentials: true,
      exposedHeaders: [`set-cookie`, `content-range`, `content-type`],
    },
  });

  app.enableShutdownHooks();
  app.setGlobalPrefix(`api`);
  app.set(`trust proxy`, 1);
  app.set(`query parser`, `extended`);

  app.use((req, res, next) => {
    const isSwaggerRoute = req.path.startsWith(`/docs`);

    if (isSwaggerRoute) {
      return helmet({ contentSecurityPolicy: false })(req, res, next);
    }

    return helmet()(req, res, next);
  });

  app.use(compression());
  app.use(new CorrelationIdMiddleware().use);

  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith(`/api/consumer/webhooks`) || req.path.startsWith(`/api/consumer/webhook`)) {
      return next();
    }

    return express.json({ limit: `10mb` })(req, res, next);
  });

  app.use(express.urlencoded({ extended: true, limit: `10mb` }));
  app.use(cookieParser(envs.SECURE_SESSION_SECRET));
  app.use(deviceIdMiddleware);
  app.use(`/uploads`, express.static(join(process.cwd(), `uploads`)));

  app.use((req, res, next) => {
    if (req.path === `/` || req.path === `/api`) {
      return res.redirect(`/docs/consumer`);
    }

    return next();
  });

  setupSwagger(app);

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

  const shouldRunBootstrapSeed = envs.NODE_ENV !== envs.ENVIRONMENT.PRODUCTION || envs.ALLOW_PRODUCTION_BOOTSTRAP_SEED;

  if (shouldRunBootstrapSeed) {
    await seed(prisma);
  } else {
    logger.log(`Skipping bootstrap seed in production (ALLOW_PRODUCTION_BOOTSTRAP_SEED=false)`);
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
  logger.log(`📘 Admin Docs → ${appUrl}/docs/admin`);
  logger.log(`📗 Consumer Docs → ${appUrl}/docs/consumer`);

  if (!isOnVercel && envs.NGROK_AUTH_TOKEN !== `NGROK_AUTH_TOKEN` && envs.NGROK_DOMAIN !== `NGROK_DOMAIN`) {
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
