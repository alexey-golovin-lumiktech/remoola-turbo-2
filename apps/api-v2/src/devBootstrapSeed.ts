import { type Logger } from '@nestjs/common';

import { type PrismaClient } from '@remoola/database-2';

import { seedBootstrapData } from './bootstrap/bootstrap-seed';
import { envs } from './envs';

export async function devBootstrapSeed(logger: Logger, prisma: PrismaClient): Promise<void> {
  if (envs.isProductionLike) {
    return;
  }

  logger.log(`Running bootstrap seed`);
  await seedBootstrapData(prisma, logger);
  logger.log(`Bootstrap seed complete`);
}
