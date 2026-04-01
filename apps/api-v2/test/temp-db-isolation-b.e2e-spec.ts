/**
 * E2E guard test proving per-file temporary DB isolation (suite B).
 * Uses an isolated temporary DB per run via @remoola/test-db/environment.
 */
/** @jest-environment @remoola/test-db/environment */

import { PrismaClient } from '@remoola/database-2';

import { assertIsolatedTestDatabaseUrl } from './test-db-safety';

describe(`Temporary DB isolation B (e2e, isolated DB)`, () => {
  const prisma = new PrismaClient();
  const markerTableName = `__temp_db_isolation_marker`;

  async function countMarkers(): Promise<number> {
    const rows = await prisma.$queryRawUnsafe<{ count: number }[]>(
      `SELECT COUNT(*)::int AS count FROM "${markerTableName}"`,
    );
    return rows[0]?.count ?? 0;
  }

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "${markerTableName}" (id SERIAL PRIMARY KEY, test_file TEXT NOT NULL)`,
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it(`uses the temporary database URL provided by test-db environment`, () => {
    expect(assertIsolatedTestDatabaseUrl()).toBeDefined();
  });

  it(`starts clean for this file and persists writes within the same file`, async () => {
    expect(await countMarkers()).toBe(0);
    await prisma.$executeRawUnsafe(`INSERT INTO "${markerTableName}" ("test_file") VALUES ('temp-db-isolation-b')`);
    expect(await countMarkers()).toBe(1);
  });
});
