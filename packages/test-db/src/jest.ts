import { createTemporaryDatabase } from './runtime';

let shutdownTemporaryDatabase: (() => Promise<void>) | null = null;
let previousDatabaseUrl: string | undefined;

beforeAll(async () => {
  const handle = await createTemporaryDatabase();
  previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = handle.databaseUrl;
  shutdownTemporaryDatabase = handle.shutdown;
}, 120_000);

afterAll(async () => {
  try {
    if (shutdownTemporaryDatabase) await shutdownTemporaryDatabase();
  } finally {
    shutdownTemporaryDatabase = null;
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    previousDatabaseUrl = undefined;
  }
});
