import { Logger, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';

import { type PrismaClient } from '@remoola/database-2';

import { AppModule } from './app.module';
import { seedBootstrapData } from './bootstrap/bootstrap-seed';
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

export async function runDevBootstrapSeed(prisma: PrismaClient): Promise<void> {
  if (envs.isProductionLike) {
    return;
  }

  logger.log(`Running bootstrap seed`);
  await seedBootstrapData(prisma, logger);
  logger.log(`Bootstrap seed complete`);
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

  if (isOnVercel) {
    process.env.NO_COLOR = `true`;
    logger.warn(`VERCEL=1 detected. This bootstrap is designed for a persistent Node server.`);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const originResolver = app.get(OriginResolverService);
  configureApp(app, originResolver);
  const prisma = app.get(PrismaService);

  await waitForDatabase(prisma);
  await runDevBootstrapSeed(prisma);

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

if (require.main === module) {
  void bootstrap().catch((error: unknown) => {
    logger.error(`Bootstrap error: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
    process.exit(1);
  });
}
