#!/usr/bin/env node
require(require('node:path').join(__dirname, 'vercel-guard.js'));

const { spawnSync } = require('node:child_process');

const TEST_DB_LABEL_KEY = 'remoola.test-db';
const TEST_DB_PROJECT_LABEL_KEY = 'remoola.test-db.project';
const TEST_DB_OWNER_PID_LABEL_KEY = 'remoola.test-db.owner-pid';
const TEST_DB_CREATED_AT_LABEL_KEY = 'remoola.test-db.created-at';
const TEST_DB_EXPIRES_AT_LABEL_KEY = 'remoola.test-db.expires-at';
const TEST_DB_NAME_PREFIX = 'remoola_test_';
const CONTAINER_NAME_SUFFIX = '-postgres-1';
const NETWORK_NAME_SUFFIX = '_default';
const DEFAULT_TEST_DB_TTL_MINUTES = 60;
const DEFAULT_JANITOR_POLL_MS = 60_000;

function parseArgs(argv) {
  const parsed = {
    watchProject: null,
    ownerPid: null,
    expiresAt: null,
    pollMs: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === '--watch-project') parsed.watchProject = argv[index + 1] ?? null;
    if (current === '--owner-pid') parsed.ownerPid = argv[index + 1] ?? null;
    if (current === '--expires-at') parsed.expiresAt = argv[index + 1] ?? null;
    if (current === '--poll-ms') parsed.pollMs = argv[index + 1] ?? null;
  }

  return parsed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseTimestamp(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function getDefaultTtlMs() {
  const parsed = Number.parseFloat(process.env.TEST_DB_TTL_MINUTES ?? '');
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_TEST_DB_TTL_MINUTES * 60 * 1000;
  return Math.floor(parsed * 60 * 1000);
}

function getPollMs(cliValue) {
  const parsed = Number.parseInt(cliValue ?? process.env.TEST_DB_JANITOR_POLL_MS ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_JANITOR_POLL_MS;
  return parsed;
}

function isPidAlive(rawPid) {
  const pid = Number.parseInt(String(rawPid ?? ''), 10);
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error && typeof error === 'object' && error.code === 'EPERM';
  }
}

function runDocker(args, options = {}) {
  const result = spawnSync('docker', args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (result.status === 0) return result.stdout.trim();
  if (options.allowFailure) return null;
  const output = [result.stdout?.trim(), result.stderr?.trim()].filter(Boolean).join('\n');
  throw new Error(`docker ${args.join(' ')} failed${output ? `\n${output}` : ''}`);
}

function listIds(kind, project) {
  if (kind === 'container') {
    const labeled = runDocker(
      ['ps', '-a', '-q', '--filter', `label=${TEST_DB_LABEL_KEY}=true`, ...(project ? ['--filter', `label=${TEST_DB_PROJECT_LABEL_KEY}=${project}`] : [])],
      { allowFailure: true },
    );
    const prefixed = runDocker(
      ['ps', '-a', '-q', '--filter', `name=${project ?? TEST_DB_NAME_PREFIX}`],
      { allowFailure: true },
    );
    return [...new Set(`${labeled ?? ''}\n${prefixed ?? ''}`.split('\n').map((value) => value.trim()).filter(Boolean))];
  }

  const labeled = runDocker(
    ['network', 'ls', '-q', '--filter', `label=${TEST_DB_LABEL_KEY}=true`, ...(project ? ['--filter', `label=${TEST_DB_PROJECT_LABEL_KEY}=${project}`] : [])],
    { allowFailure: true },
  );
  const prefixed = runDocker(
    ['network', 'ls', '-q', '--filter', `name=${project ?? TEST_DB_NAME_PREFIX}`],
    { allowFailure: true },
  );
  return [...new Set(`${labeled ?? ''}\n${prefixed ?? ''}`.split('\n').map((value) => value.trim()).filter(Boolean))];
}

function inspect(kind, ids) {
  if (ids.length === 0) return [];
  const args = kind === 'container' ? ['inspect', ...ids] : ['network', 'inspect', ...ids];
  const raw = runDocker(args, { allowFailure: true });
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function inferProjectFromName(name) {
  if (!name || typeof name !== 'string') return null;
  const normalized = name.startsWith('/') ? name.slice(1) : name;
  if (!normalized.startsWith(TEST_DB_NAME_PREFIX)) return null;
  if (normalized.endsWith(CONTAINER_NAME_SUFFIX)) {
    return normalized.slice(0, -CONTAINER_NAME_SUFFIX.length);
  }
  if (normalized.endsWith(NETWORK_NAME_SUFFIX)) {
    return normalized.slice(0, -NETWORK_NAME_SUFFIX.length);
  }
  return normalized;
}

function getProjectFromResource(resource) {
  const labels = resource?.Config?.Labels ?? resource?.Labels ?? {};
  return labels[TEST_DB_PROJECT_LABEL_KEY] ?? inferProjectFromName(resource?.Name) ?? null;
}

function getOwnerPidFromResource(resource) {
  const labels = resource?.Config?.Labels ?? resource?.Labels ?? {};
  return labels[TEST_DB_OWNER_PID_LABEL_KEY] ?? null;
}

function getExpiryMsFromResource(resource) {
  const labels = resource?.Config?.Labels ?? resource?.Labels ?? {};
  const explicitExpiryMs = parseTimestamp(labels[TEST_DB_EXPIRES_AT_LABEL_KEY]);
  if (explicitExpiryMs !== null) return explicitExpiryMs;

  const createdLabelMs = parseTimestamp(labels[TEST_DB_CREATED_AT_LABEL_KEY]);
  if (createdLabelMs !== null) return createdLabelMs + getDefaultTtlMs();

  const resourceCreatedMs = parseTimestamp(resource?.Created);
  if (resourceCreatedMs !== null) return resourceCreatedMs + getDefaultTtlMs();

  return Date.now() + getDefaultTtlMs();
}

function collectProjects(project) {
  const containers = inspect('container', listIds('container', project));
  const networks = inspect('network', listIds('network', project));
  const projects = new Map();

  const register = (resourceType, resource) => {
    const resourceProject = getProjectFromResource(resource);
    if (!resourceProject) return;
    const current = projects.get(resourceProject) ?? { containers: [], networks: [] };
    if (resourceType === 'container') current.containers.push(resource);
    else current.networks.push(resource);
    projects.set(resourceProject, current);
  };

  containers.forEach((resource) => register('container', resource));
  networks.forEach((resource) => register('network', resource));
  return projects;
}

function shouldCleanupProject(resources, explicitOwnerPid, explicitExpiresAtMs) {
  const allResources = [...resources.containers, ...resources.networks];
  if (allResources.length === 0) return false;

  const expiryMsCandidates = [
    explicitExpiresAtMs,
    ...allResources.map((resource) => getExpiryMsFromResource(resource)),
  ].filter((value) => Number.isFinite(value));
  const effectiveExpiryMs = expiryMsCandidates.length > 0 ? Math.min(...expiryMsCandidates) : Date.now();
  if (Date.now() < effectiveExpiryMs) return false;

  const ownerPids = new Set(
    [explicitOwnerPid, ...allResources.map((resource) => getOwnerPidFromResource(resource))]
      .map((value) => (value == null ? null : String(value)))
      .filter(Boolean),
  );
  if (ownerPids.size === 0) return true;

  return [...ownerPids].every((pid) => !isPidAlive(pid));
}

function cleanupProject(projectName, resources) {
  const containerIds = resources.containers.map((resource) => resource.Id).filter(Boolean);
  const networkIds = resources.networks.map((resource) => resource.Id).filter(Boolean);

  if (containerIds.length > 0) {
    runDocker(['rm', '-f', ...containerIds], { allowFailure: true });
  }

  if (networkIds.length > 0) {
    runDocker(['network', 'rm', ...networkIds], { allowFailure: true });
  }

  process.stdout.write(`[test-db-cleanup] removed stale resources for ${projectName}\n`);
}

function sweep(project, explicitOwnerPid, explicitExpiresAtMs) {
  const projects = collectProjects(project);
  for (const [projectName, resources] of projects.entries()) {
    if (shouldCleanupProject(resources, explicitOwnerPid, explicitExpiresAtMs)) {
      cleanupProject(projectName, resources);
    }
  }
}

async function watchProject(project, ownerPid, expiresAt, pollMs) {
  const expiryMs = parseTimestamp(expiresAt);
  if (!project || expiryMs === null) {
    throw new Error(`--watch-project and --expires-at are required together`);
  }

  while (true) {
    const projects = collectProjects(project);
    const resources = projects.get(project);
    if (!resources || (resources.containers.length === 0 && resources.networks.length === 0)) return;

    if (shouldCleanupProject(resources, ownerPid, expiryMs)) {
      cleanupProject(project, resources);
      return;
    }

    const now = Date.now();
    const waitMs = now < expiryMs ? Math.max(250, Math.min(expiryMs - now, pollMs)) : pollMs;
    await sleep(waitMs);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.watchProject) {
    await watchProject(args.watchProject, args.ownerPid, args.expiresAt, getPollMs(args.pollMs));
    return;
  }

  sweep(null, null, null);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[test-db-cleanup] ${message}\n`);
  process.exit(1);
});
