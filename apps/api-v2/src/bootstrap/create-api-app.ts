import { type Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, type NestExpressApplication } from '@nestjs/platform-express';
import { type Express } from 'express';

import { AppModule } from '../app.module';
import { configureApp } from '../configure-app';
import { devBootstrapSeed } from '../devBootstrapSeed';
import { OriginResolverService } from '../shared/origin-resolver.service';
import { PrismaService } from '../shared/prisma.service';
import { waitForDatabase } from '../waitForDatabase';

type CreateApiAppOptions = {
  logger: Logger;
  server?: Express;
};

export async function createApiApp({ logger, server }: CreateApiAppOptions): Promise<NestExpressApplication> {
  const app = server
    ? await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(server), { rawBody: true })
    : await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  const originResolver = app.get(OriginResolverService);
  configureApp(app, originResolver);

  const prisma = app.get(PrismaService);
  await waitForDatabase(logger, prisma);
  await devBootstrapSeed(logger, prisma);

  return app;
}
