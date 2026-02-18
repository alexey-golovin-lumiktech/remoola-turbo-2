import NodeEnvironment from 'jest-environment-node';

import { PrismaClient } from '@remoola/database-2';

import { createTemporaryDatabase, type TemporaryDatabaseHandle } from './runtime';

export default class TemporaryDatabaseEnvironment extends NodeEnvironment {
  private temporaryDatabaseHandle: TemporaryDatabaseHandle | null = null;
  private previousDatabaseUrl: string | undefined;
  private previousTestDatabaseUrl: string | undefined;
  private currentDatabaseUrl: string | null = null;
  private readonly testFilePath: string | undefined;

  constructor(
    config: ConstructorParameters<typeof NodeEnvironment>[0],
    context: ConstructorParameters<typeof NodeEnvironment>[1],
  ) {
    super(config, context);
    this.testFilePath = context.testPath;
  }

  private getTestFileLabel(): string {
    return this.testFilePath ?? `unknown-test-file`;
  }

  private toComparableDbIdentity(databaseUrl: string): string {
    try {
      const parsed = new URL(databaseUrl);
      const normalizedPath = parsed.pathname.replace(/^\//, ``);
      return `${parsed.protocol}//${parsed.hostname}:${parsed.port}/${normalizedPath}`;
    } catch {
      return databaseUrl;
    }
  }

  private redactDatabaseUrl(databaseUrl: string): string {
    try {
      const parsed = new URL(databaseUrl);
      if (parsed.password) parsed.password = `***`;
      return parsed.toString();
    } catch {
      return databaseUrl;
    }
  }

  private async assertTemporaryDatabaseIsolation(
    temporaryDatabaseUrl: string,
    originalDatabaseUrl: string | undefined,
    originalTestDatabaseUrl: string | undefined,
  ): Promise<void> {
    const originalCandidates = [originalDatabaseUrl, originalTestDatabaseUrl].filter((value): value is string =>
      Boolean(value),
    );
    const temporaryIdentity = this.toComparableDbIdentity(temporaryDatabaseUrl);
    for (const candidate of originalCandidates) {
      const candidateIdentity = this.toComparableDbIdentity(candidate);
      if (candidateIdentity === temporaryIdentity) {
        throw new Error(
          `Temporary test database resolves to the same DB as existing local env (${candidateIdentity}). ` +
            `Refusing to run tests against a non-isolated database.`,
        );
      }
    }

    if (originalCandidates.length === 0) return;

    const marker = `isolation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const temporaryPrisma = new PrismaClient({ datasources: { db: { url: temporaryDatabaseUrl } } });
    const originalPrisma = new PrismaClient({ datasources: { db: { url: originalCandidates[0] } } });
    try {
      await temporaryPrisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "__temp_db_guard" (id SERIAL PRIMARY KEY, marker TEXT NOT NULL)`,
      );
      await temporaryPrisma.$executeRawUnsafe(`INSERT INTO "__temp_db_guard" ("marker") VALUES ($1)`, marker);

      const rows = await originalPrisma.$queryRawUnsafe<{ exists: boolean }[]>(
        `SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = '__temp_db_guard'
        ) AS "exists"`,
      );

      if (rows[0]?.exists) {
        const leakedRows = await originalPrisma.$queryRawUnsafe<{ count: number }[]>(
          `SELECT COUNT(*)::int AS count FROM "__temp_db_guard" WHERE "marker" = $1`,
          marker,
        );
        if ((leakedRows[0]?.count ?? 0) > 0) {
          throw new Error(
            `Isolation check failed: marker data written during tests appeared in original/local DB instance.`,
          );
        }
      }
    } finally {
      await temporaryPrisma.$disconnect();
      await originalPrisma.$disconnect();
    }
  }

  async setup(): Promise<void> {
    await super.setup();
    const handle = await createTemporaryDatabase();
    this.previousDatabaseUrl = this.global.process?.env.DATABASE_URL;
    this.previousTestDatabaseUrl = this.global.process?.env.TEST_DATABASE_URL;
    await this.assertTemporaryDatabaseIsolation(
      handle.databaseUrl,
      this.previousDatabaseUrl,
      this.previousTestDatabaseUrl,
    );
    if (this.global.process) this.global.process.env.DATABASE_URL = handle.databaseUrl;
    if (this.global.process) this.global.process.env.TEST_DATABASE_URL = handle.databaseUrl;
    process.env.DATABASE_URL = handle.databaseUrl;
    process.env.TEST_DATABASE_URL = handle.databaseUrl;
    this.currentDatabaseUrl = handle.databaseUrl;
    this.temporaryDatabaseHandle = handle;
    console.info(`[test-db] ${this.redactDatabaseUrl(handle.databaseUrl)}`);
  }

  async teardown(): Promise<void> {
    try {
      if (this.temporaryDatabaseHandle) await this.temporaryDatabaseHandle.shutdown();
    } finally {
      this.currentDatabaseUrl = null;
      this.temporaryDatabaseHandle = null;
      if (this.previousDatabaseUrl === undefined) {
        if (this.global.process) delete this.global.process.env.DATABASE_URL;
        delete process.env.DATABASE_URL;
      } else {
        if (this.global.process) this.global.process.env.DATABASE_URL = this.previousDatabaseUrl;
        process.env.DATABASE_URL = this.previousDatabaseUrl;
      }
      if (this.previousTestDatabaseUrl === undefined) {
        if (this.global.process) delete this.global.process.env.TEST_DATABASE_URL;
        delete process.env.TEST_DATABASE_URL;
      } else {
        if (this.global.process) this.global.process.env.TEST_DATABASE_URL = this.previousTestDatabaseUrl;
        process.env.TEST_DATABASE_URL = this.previousTestDatabaseUrl;
      }
      this.previousDatabaseUrl = undefined;
      this.previousTestDatabaseUrl = undefined;
      await super.teardown();
    }
  }
}
