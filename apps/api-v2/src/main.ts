import { type IncomingMessage, type ServerResponse } from 'node:http';

import { Logger, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import express, { type Express } from 'express';

import { createApiApp } from './bootstrap/create-api-app';
import { envs } from './envs';
import { NgrokIngressService } from './infrastructure/ngrok/ngrok-ingress.service';

const logger = new Logger(`Bootstrap`);

// Vercel's NestJS detector requires the entrypoint file itself to import @nestjs/core.
export const vercelNestEntrypointDetector = NestFactory;

let isShuttingDown = false;
let vercelServer: Express | undefined;
let vercelServerPromise: Promise<Express> | undefined;

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

  const app = await createApiApp({ logger });

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

async function createVercelServer(): Promise<Express> {
  const server = express();
  const app = await createApiApp({ logger, server });
  await app.init();

  return server;
}

async function getVercelServer(): Promise<Express> {
  if (vercelServer) {
    return vercelServer;
  }

  vercelServerPromise ??= createVercelServer();
  try {
    vercelServer = await vercelServerPromise;
    return vercelServer;
  } catch (error) {
    vercelServerPromise = undefined;
    throw error;
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const server = await getVercelServer();
  server(req, res);
}

if (require.main === module) {
  void bootstrap().catch((error: unknown) => {
    logger.error(`Bootstrap error: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
    process.exit(1);
  });
}
