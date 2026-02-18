import { spawnSync } from 'node:child_process';
import { randomInt } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { PrismaClient } from '@remoola/database-2';

const DEFAULT_SCHEMA_RELATIVE_PATH = `packages/database-2/prisma/schema.prisma` as const;
const DEFAULT_DOCKER_COMPOSE_RELATIVE_PATH = `packages/test-db/docker-compose.test.yml` as const;
const DEFAULT_PROVIDER = `docker-compose` as const;

type TestDatabaseProvider = `docker-compose` | `testcontainers`;

type DockerComposeMetadata = {
  projectName: string;
  composePath: string;
};

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
    const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
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
  const composePath = join(repoRoot, DEFAULT_DOCKER_COMPOSE_RELATIVE_PATH);
  const databaseUrl = `postgresql://${databaseUser}:${databasePassword}@127.0.0.1:${hostPort}/${databaseName}`;

  const composeEnv = {
    ...process.env,
    TEST_DB_NAME: databaseName,
    TEST_DB_USER: databaseUser,
    TEST_DB_PASSWORD: databasePassword,
    TEST_DB_HOST_PORT: String(hostPort),
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
  return {
    databaseUrl,
    shutdown: async () => {
      runDockerCompose(
        [`-f`, metadata.composePath, `-p`, metadata.projectName, `down`, `--volumes`, `--remove-orphans`],
        repoRoot,
        composeEnv,
        `Failed to stop temporary docker-compose database.`,
      );
    },
  };
}

async function createTemporaryDatabaseWithTestcontainers(repoRoot: string): Promise<TemporaryDatabaseHandle> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(`postgres:16-alpine`)
    .withDatabase(`test`)
    .withUsername(`postgres`)
    .withPassword(`postgres`)
    .start();

  const databaseUrl = container.getConnectionUri();
  await waitForDatabaseReady(databaseUrl);
  runPrismaMigrations(repoRoot, databaseUrl);
  await prefillDatabase(databaseUrl);

  return {
    databaseUrl,
    shutdown: async () => {
      await container.stop();
    },
  };
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
