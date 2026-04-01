export function assertIsolatedTestDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(`DATABASE_URL must be defined for DB-backed e2e tests.`);
  }

  if (testDatabaseUrl !== databaseUrl) {
    throw new Error(`TEST_DATABASE_URL must match DATABASE_URL for isolated e2e runs.`);
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error(`DATABASE_URL must be a valid URL in DB-backed e2e tests.`);
  }

  if (![`127.0.0.1`, `localhost`].includes(parsed.hostname)) {
    throw new Error(`DB-backed e2e tests must run against localhost test DB only.`);
  }

  const databaseName = parsed.pathname.replace(/^\//, ``);
  if (!databaseName.startsWith(`remoola_test_`) && databaseName !== `test`) {
    throw new Error(`DB-backed e2e tests must use isolated temporary DB names.`);
  }

  return databaseUrl;
}
