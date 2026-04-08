import { spawn, spawnSync } from 'node:child_process';
import { randomInt } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { PrismaClient } from '@remoola/database-2';

const DEFAULT_SCHEMA_RELATIVE_PATH = `packages/database-2/prisma/schema.prisma` as const;
const DEFAULT_DOCKER_COMPOSE_RELATIVE_PATH = `packages/test-db/docker-compose.test.yml` as const;
const DEFAULT_PROVIDER = `docker-compose` as const;
const PG_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const TEST_DB_LABEL_KEY = `remoola.test-db` as const;
const TEST_DB_PROJECT_LABEL_KEY = `remoola.test-db.project` as const;
const TEST_DB_PROVIDER_LABEL_KEY = `remoola.test-db.provider` as const;
const TEST_DB_OWNER_PID_LABEL_KEY = `remoola.test-db.owner-pid` as const;
const TEST_DB_CREATED_AT_LABEL_KEY = `remoola.test-db.created-at` as const;
const TEST_DB_EXPIRES_AT_LABEL_KEY = `remoola.test-db.expires-at` as const;
const DEFAULT_TEST_DB_TTL_MINUTES = 60;

type TemporaryDatabaseShutdownHandle = {
  databaseUrl: string;
  shutdown: () => Promise<void>;
  shutdownSync?: () => void;
};

type TemporaryDatabaseLifecycleMetadata = {
  repoRoot: string;
  provider: TestDatabaseProvider;
  projectName: string;
  ownerPid: number;
  createdAt: string;
  expiresAt: string;
};

const trackedTemporaryDatabaseHandles = new Set<TemporaryDatabaseShutdownHandle>();
let processCleanupHooksInstalled = false;
let cleanupPromise: Promise<void> | null = null;
let signalCleanupInProgress = false;

type TestDatabaseProvider = `docker-compose` | `testcontainers`;

type DockerComposeMetadata = {
  projectName: string;
  composePath: string;
};

function getTestDbTtlMs(): number {
  const raw = process.env.TEST_DB_TTL_MINUTES;
  const parsed = Number.parseFloat(raw ?? ``);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_TEST_DB_TTL_MINUTES * 60 * 1000;
  return Math.floor(parsed * 60 * 1000);
}

function createLifecycleMetadata(
  repoRoot: string,
  provider: TestDatabaseProvider,
  projectName: string,
): TemporaryDatabaseLifecycleMetadata {
  const createdAt = new Date();
  return {
    repoRoot,
    provider,
    projectName,
    ownerPid: process.pid,
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + getTestDbTtlMs()).toISOString(),
  };
}

function buildTestDbLabels(metadata: TemporaryDatabaseLifecycleMetadata): Record<string, string> {
  return {
    [TEST_DB_LABEL_KEY]: `true`,
    [TEST_DB_PROJECT_LABEL_KEY]: metadata.projectName,
    [TEST_DB_PROVIDER_LABEL_KEY]: metadata.provider,
    [TEST_DB_OWNER_PID_LABEL_KEY]: String(metadata.ownerPid),
    [TEST_DB_CREATED_AT_LABEL_KEY]: metadata.createdAt,
    [TEST_DB_EXPIRES_AT_LABEL_KEY]: metadata.expiresAt,
  };
}

function spawnDetachedCleanupWatcher(metadata: TemporaryDatabaseLifecycleMetadata): void {
  const cleanupScriptPath = join(metadata.repoRoot, `scripts`, `cleanup-stale-test-dbs.js`);
  const child = spawn(
    process.execPath,
    [
      cleanupScriptPath,
      `--watch-project`,
      metadata.projectName,
      `--owner-pid`,
      String(metadata.ownerPid),
      `--expires-at`,
      metadata.expiresAt,
    ],
    {
      cwd: metadata.repoRoot,
      detached: true,
      stdio: `ignore`,
      env: process.env,
    },
  );
  child.unref();
}

function signalToExitCode(signal: NodeJS.Signals): number {
  if (signal === `SIGHUP`) return 129;
  if (signal === `SIGINT`) return 130;
  if (signal === `SIGTERM`) return 143;
  return 1;
}

async function cleanupTrackedTemporaryDatabases(): Promise<void> {
  if (trackedTemporaryDatabaseHandles.size === 0) return;
  if (cleanupPromise) {
    await cleanupPromise;
    return;
  }

  const handles = [...trackedTemporaryDatabaseHandles];
  cleanupPromise = (async () => {
    for (const handle of handles) {
      try {
        await handle.shutdown();
      } catch {
        // best-effort cleanup during process shutdown
      }
    }
  })().finally(() => {
    cleanupPromise = null;
  });

  await cleanupPromise;
}

function cleanupTrackedTemporaryDatabasesSync(): void {
  for (const handle of [...trackedTemporaryDatabaseHandles]) {
    try {
      handle.shutdownSync?.();
    } catch {
      // best-effort cleanup during process shutdown
    }
    trackedTemporaryDatabaseHandles.delete(handle);
  }
}

function installProcessCleanupHooks(): void {
  if (processCleanupHooksInstalled) return;
  processCleanupHooksInstalled = true;

  process.on(`beforeExit`, () => {
    if (trackedTemporaryDatabaseHandles.size === 0) return;
    void cleanupTrackedTemporaryDatabases();
  });

  process.on(`exit`, () => {
    cleanupTrackedTemporaryDatabasesSync();
  });

  const handleSignal = (signal: NodeJS.Signals) => {
    if (signalCleanupInProgress) return;
    signalCleanupInProgress = true;

    void (async () => {
      try {
        await cleanupTrackedTemporaryDatabases();
      } finally {
        try {
          process.kill(process.pid, signal);
        } catch {
          process.exit(signalToExitCode(signal));
        }
      }
    })();
  };

  process.once(`SIGINT`, () => handleSignal(`SIGINT`));
  process.once(`SIGTERM`, () => handleSignal(`SIGTERM`));
  process.once(`SIGHUP`, () => handleSignal(`SIGHUP`));
}

function registerTemporaryDatabaseHandle(handle: TemporaryDatabaseShutdownHandle): TemporaryDatabaseHandle {
  installProcessCleanupHooks();

  let closed = false;
  const trackedHandle: TemporaryDatabaseShutdownHandle = {
    databaseUrl: handle.databaseUrl,
    shutdown: async () => {
      if (closed) return;
      closed = true;
      trackedTemporaryDatabaseHandles.delete(trackedHandle);
      await handle.shutdown();
    },
    shutdownSync: () => {
      if (closed) return;
      closed = true;
      trackedTemporaryDatabaseHandles.delete(trackedHandle);
      handle.shutdownSync?.();
    },
  };

  trackedTemporaryDatabaseHandles.add(trackedHandle);
  return { databaseUrl: trackedHandle.databaseUrl, shutdown: trackedHandle.shutdown };
}

function hasMonorepoWorkspaces(packageJsonPath: string): boolean {
  try {
    const raw = readFileSync(packageJsonPath, `utf8`);
    const parsed = JSON.parse(raw) as { workspaces?: unknown };
    return Array.isArray(parsed.workspaces);
  } catch {
    return false;
  }
}

function resolveMonorepoRoot(startingDir: string): string {
  let current = startingDir;
  for (let depth = 0; depth < 10; depth += 1) {
    const packageJsonPath = join(current, `package.json`);
    if (existsSync(packageJsonPath) && hasMonorepoWorkspaces(packageJsonPath)) return current;
    const parent = join(current, `..`);
    if (parent === current) break;
    current = parent;
  }
  throw new Error(`Cannot resolve monorepo root from ${startingDir}`);
}

function runPrismaMigrations(repoRoot: string, databaseUrl: string): void {
  const schemaPath = join(repoRoot, DEFAULT_SCHEMA_RELATIVE_PATH);
  const result = spawnSync(`yarn`, [`prisma`, `migrate`, `deploy`, `--schema`, schemaPath], {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: `utf8`,
    stdio: `pipe`,
  });

  if (result.status === 0) return;

  const stdout = result.stdout?.trim();
  const stderr = result.stderr?.trim();
  const output = [stdout, stderr].filter(Boolean).join(`\n`);
  throw new Error(`Failed to run prisma migrations for temporary test DB.${output ? `\n${output}` : ``}`);
}

function runDockerCompose(args: string[], repoRoot: string, env: NodeJS.ProcessEnv, failureMessage: string): void {
  const result = spawnSync(`docker`, [`compose`, ...args], {
    cwd: repoRoot,
    env,
    encoding: `utf8`,
    stdio: `pipe`,
  });
  if (result.status === 0) return;
  const output = [result.stdout?.trim(), result.stderr?.trim()].filter(Boolean).join(`\n`);
  throw new Error(`${failureMessage}${output ? `\n${output}` : ``}`);
}

async function waitForDatabaseReady(databaseUrl: string): Promise<void> {
  const maxAttempts = 60;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    try {
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch {
      if (attempt === maxAttempts) throw new Error(`Temporary database did not become ready in time`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      await prisma.$disconnect();
    }
  }
}

async function prefillDatabase(databaseUrl: string): Promise<void> {
  const result = spawnSync(`yarn`, [`workspace`, `@remoola/db-fixtures`, `run`, `fill`, `--`, `--per-table=1`], {
    cwd: resolveMonorepoRoot(process.cwd()),
    env: { ...process.env, NODE_ENV: `test`, DATABASE_URL: databaseUrl },
    encoding: `utf8`,
    stdio: `pipe`,
  });
  if (result.status === 0) return;
  const output = [result.stdout?.trim(), result.stderr?.trim()].filter(Boolean).join(`\n`);
  throw new Error(`Failed to prefill temporary database using @remoola/db-fixtures.${output ? `\n${output}` : ``}`);
}

async function truncatePublicTables(databaseUrl: string): Promise<void> {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    const rows = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename <> '_prisma_migrations'
    `;
    const tableNames = rows
      .map((row) => row.tablename)
      .filter((name) => typeof name === `string` && PG_IDENTIFIER_PATTERN.test(name))
      .map((name) => `"public"."${name.replace(/"/g, `""`)}"`);
    if (tableNames.length === 0) return;
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames.join(`, `)} RESTART IDENTITY CASCADE`);
  } finally {
    await prisma.$disconnect();
  }
}

function getProvider(): TestDatabaseProvider {
  const raw = (process.env.TEST_DB_PROVIDER || DEFAULT_PROVIDER).trim().toLowerCase();
  if (raw === `docker-compose`) return `docker-compose`;
  if (raw === `testcontainers`) return `testcontainers`;
  return DEFAULT_PROVIDER;
}

async function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on(`error`, reject);
    server.listen(0, `127.0.0.1`, () => {
      const address = server.address();
      if (!address || typeof address === `string`) {
        server.close(() => reject(new Error(`Failed to allocate a free TCP port for temporary database`)));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

function createUniqueSuffix(): string {
  return `${Date.now()}-${process.pid}-${randomInt(1000, 9999)}`;
}

async function createTemporaryDatabaseWithDockerCompose(repoRoot: string): Promise<TemporaryDatabaseHandle> {
  const suffix = createUniqueSuffix();
  const databaseName = `remoola_test_${suffix.replace(/[^a-zA-Z0-9_]/g, `_`)}`;
  const databaseUser = `postgres`;
  const databasePassword = `postgres`;
  const hostPort = await getAvailablePort();
  const projectName = `remoola_test_${suffix.replace(/[^a-zA-Z0-9_]/g, `_`)}`;
  const lifecycleMetadata = createLifecycleMetadata(repoRoot, `docker-compose`, projectName);
  const composePath = join(repoRoot, DEFAULT_DOCKER_COMPOSE_RELATIVE_PATH);
  const databaseUrl = `postgresql://${databaseUser}:${databasePassword}@127.0.0.1:${hostPort}/${databaseName}`;

  const composeEnv = {
    ...process.env,
    TEST_DB_NAME: databaseName,
    TEST_DB_USER: databaseUser,
    TEST_DB_PASSWORD: databasePassword,
    TEST_DB_HOST_PORT: String(hostPort),
    TEST_DB_PROJECT: lifecycleMetadata.projectName,
    TEST_DB_PROVIDER: lifecycleMetadata.provider,
    TEST_DB_OWNER_PID: String(lifecycleMetadata.ownerPid),
    TEST_DB_CREATED_AT: lifecycleMetadata.createdAt,
    TEST_DB_EXPIRES_AT: lifecycleMetadata.expiresAt,
  };

  runDockerCompose(
    [`-f`, composePath, `-p`, projectName, `up`, `-d`],
    repoRoot,
    composeEnv,
    `Failed to start temporary docker-compose database.`,
  );

  try {
    await waitForDatabaseReady(databaseUrl);
    runPrismaMigrations(repoRoot, databaseUrl);
    await prefillDatabase(databaseUrl);
  } catch (error) {
    try {
      runDockerCompose(
        [`-f`, composePath, `-p`, projectName, `down`, `--volumes`, `--remove-orphans`],
        repoRoot,
        composeEnv,
        `Failed to cleanup temporary docker-compose database after setup error.`,
      );
    } catch {
      // swallow cleanup failure in error path
    }
    throw error;
  }

  const metadata: DockerComposeMetadata = { projectName, composePath };
  spawnDetachedCleanupWatcher(lifecycleMetadata);
  return registerTemporaryDatabaseHandle({
    databaseUrl,
    shutdown: async () => {
      runDockerCompose(
        [`-f`, metadata.composePath, `-p`, metadata.projectName, `down`, `--volumes`, `--remove-orphans`],
        repoRoot,
        composeEnv,
        `Failed to stop temporary docker-compose database.`,
      );
    },
    shutdownSync: () => {
      runDockerCompose(
        [`-f`, metadata.composePath, `-p`, metadata.projectName, `down`, `--volumes`, `--remove-orphans`],
        repoRoot,
        composeEnv,
        `Failed to stop temporary docker-compose database.`,
      );
    },
  });
}

async function createTemporaryDatabaseWithTestcontainers(repoRoot: string): Promise<TemporaryDatabaseHandle> {
  const projectName = `remoola_test_${createUniqueSuffix().replace(/[^a-zA-Z0-9_]/g, `_`)}`;
  const lifecycleMetadata = createLifecycleMetadata(repoRoot, `testcontainers`, projectName);
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(`postgres:16-alpine`)
    .withDatabase(`test`)
    .withUsername(`postgres`)
    .withPassword(`postgres`)
    .withLabels(buildTestDbLabels(lifecycleMetadata))
    .start();

  const databaseUrl = container.getConnectionUri();
  try {
    await waitForDatabaseReady(databaseUrl);
    runPrismaMigrations(repoRoot, databaseUrl);
    await prefillDatabase(databaseUrl);
  } catch (error) {
    try {
      await container.stop();
    } catch {
      // swallow cleanup failure in error path
    }
    throw error;
  }

  spawnDetachedCleanupWatcher(lifecycleMetadata);
  return registerTemporaryDatabaseHandle({
    databaseUrl,
    shutdown: async () => {
      await container.stop();
    },
  });
}

export type TemporaryDatabaseHandle = {
  databaseUrl: string;
  shutdown: () => Promise<void>;
};

export async function createTemporaryDatabase(): Promise<TemporaryDatabaseHandle> {
  const repoRoot = resolveMonorepoRoot(process.cwd());
  const provider = getProvider();
  if (provider === `docker-compose`) {
    try {
      return await createTemporaryDatabaseWithDockerCompose(repoRoot);
    } catch {
      // If docker compose is unavailable, fallback to Testcontainers automatically.
      return createTemporaryDatabaseWithTestcontainers(repoRoot);
    }
  }
  return createTemporaryDatabaseWithTestcontainers(repoRoot);
}

export async function resetTemporaryDatabase(databaseUrl: string): Promise<void> {
  await truncatePublicTables(databaseUrl);
  await prefillDatabase(databaseUrl);
}
