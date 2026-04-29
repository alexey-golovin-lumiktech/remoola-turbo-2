import { PrismaClient } from '@remoola/database-2';

import { assertIsolatedTestDatabaseUrl } from '../test-db-safety';

type PrismaTestContextOptions = {
  datasourceUrl?: string;
};

export function createPrismaTestContext(options: PrismaTestContextOptions = {}) {
  const prisma = options.datasourceUrl
    ? new PrismaClient({ datasourceUrl: options.datasourceUrl })
    : new PrismaClient();

  return {
    prisma,
    async connect() {
      assertIsolatedTestDatabaseUrl();
      await prisma.$connect();
      return prisma;
    },
    async disconnect() {
      await prisma.$disconnect();
    },
  };
}
