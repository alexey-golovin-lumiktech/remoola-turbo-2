import { type Logger } from '@nestjs/common';

import { type PrismaClient } from '@remoola/database-2';

const DB_CONNECT_MAX_ATTEMPTS = 30;
const DB_CONNECT_DELAY_MS = 500;
export async function waitForDatabase(logger: Logger, prisma: PrismaClient): Promise<void> {
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
