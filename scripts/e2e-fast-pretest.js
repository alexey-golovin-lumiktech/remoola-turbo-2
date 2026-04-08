#!/usr/bin/env node
const path = require('node:path');
require(path.join(__dirname, 'vercel-guard.js'));

const fs = require('node:fs');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

function isWorkspaceRoot(dirPath) {
  try {
    const packageJsonPath = path.join(dirPath, 'package.json');
    const raw = fs.readFileSync(packageJsonPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.workspaces);
  } catch {
    return false;
  }
}

function resolveRepoRoot(startingDir) {
  let current = startingDir;
  for (let depth = 0; depth < 10; depth += 1) {
    if (isWorkspaceRoot(current)) return current;
    const parent = path.join(current, '..');
    if (parent === current) break;
    current = parent;
  }
  throw new Error(`Unable to resolve workspace root from ${startingDir}`);
}

function listFilesRecursively(targetDir) {
  if (!fs.existsSync(targetDir)) return [];
  const entries = fs.readdirSync(targetDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.turbo') continue;
    const fullPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) files.push(...listFilesRecursively(fullPath));
    else files.push(fullPath);
  }
  return files;
}

function computeInputSignature(repoRoot) {
  const trackedPaths = [
    'packages/test-db/src',
    'packages/test-db/package.json',
    'packages/test-db/tsconfig.json',
    'packages/db-fixtures/src',
    'packages/db-fixtures/package.json',
    'packages/db-fixtures/tsconfig.json',
  ];
  const files = trackedPaths
    .flatMap((relative) => {
      const absolute = path.join(repoRoot, relative);
      if (fs.existsSync(absolute) && fs.statSync(absolute).isDirectory()) return listFilesRecursively(absolute);
      return fs.existsSync(absolute) ? [absolute] : [];
    })
    .sort();

  const hash = crypto.createHash('sha256');
  for (const filePath of files) {
    const stats = fs.statSync(filePath);
    hash.update(filePath.replace(repoRoot, ''));
    hash.update(':');
    hash.update(String(stats.size));
    hash.update(':');
    hash.update(String(Math.floor(stats.mtimeMs)));
    hash.update('\n');
  }
  return hash.digest('hex');
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  const repoRoot = resolveRepoRoot(process.cwd());
  const cacheDir = path.join(repoRoot, '.cache');
  const stampPath = path.join(cacheDir, 'e2e-fast-pretest-stamp.json');
  const currentSignature = computeInputSignature(repoRoot);

  let previousSignature = null;
  try {
    const raw = fs.readFileSync(stampPath, 'utf8');
    previousSignature = JSON.parse(raw).signature ?? null;
  } catch {
    previousSignature = null;
  }

  if (previousSignature === currentSignature) {
    process.stdout.write('[e2e-fast-pretest] Inputs unchanged. Skipping @remoola/db-fixtures and @remoola/test-db rebuild.\n');
    return;
  }

  process.stdout.write('[e2e-fast-pretest] Changes detected. Rebuilding @remoola/db-fixtures and @remoola/test-db.\n');
  run('yarn', ['workspace', '@remoola/db-fixtures', 'build'], repoRoot);
  run('yarn', ['workspace', '@remoola/test-db', 'build'], repoRoot);

  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(
    stampPath,
    JSON.stringify({ signature: currentSignature, updatedAt: new Date().toISOString() }, null, 2) + '\n',
    'utf8',
  );
}

main();
