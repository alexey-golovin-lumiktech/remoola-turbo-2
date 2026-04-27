import { Logger, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';

import { $Enums, type PrismaClient } from '@remoola/database-2';

import { AppModule } from './app.module';
import { syncBootstrapAdminSeedAccounts } from './bootstrap/admin-bootstrap-rbac';
import { configureApp } from './configure-app';
import { envs } from './envs';
import { NgrokIngressService } from './infrastructure/ngrok/ngrok-ingress.service';
import { OriginResolverService } from './shared/origin-resolver.service';
import { PrismaService } from './shared/prisma.service';

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

  await syncBootstrapAdminSeedAccounts({
    prisma,
    admins,
    logger,
  });

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

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  configureApp(app, originResolver);
  const prisma = app.get(PrismaService);

  await waitForDatabase(prisma);

  const shouldRunBootstrapSeed = !envs.isProductionLike || envs.ALLOW_PRODUCTION_BOOTSTRAP_SEED;

  if (shouldRunBootstrapSeed) {
    await seed(prisma);
  } else {
    logger.log(`Skipping bootstrap seed in production-like runtime (ALLOW_PRODUCTION_BOOTSTRAP_SEED=false)`);
  }

  const port = envs.PORT || 3000;
  await app.listen(port);

  const appUrl = await app.getUrl();

  logger.log(`🚀 API running on ${appUrl}/api`);
  if (envs.SWAGGER_ENABLED) {
    logger.log(`📘 Admin Docs → ${appUrl}/docs/admin`);
    logger.log(`📗 Consumer Docs → ${appUrl}/docs/consumer`);
  }

  // TESTING
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
