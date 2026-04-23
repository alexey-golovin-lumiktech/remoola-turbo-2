#!/usr/bin/env node
// Pre-commit helper: run tests only for workspaces touched by staged files and
// their local dependents.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKSPACE_PREFIXES = ['apps', 'packages'];

function log(message) {
  process.stdout.write(`${message}\n`);
}

function warn(message) {
  process.stderr.write(`${message}\n`);
}

function runCapture(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd ?? repoRoot,
      env: opts.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => {
      resolve({ code: -1, stdout, stderr: stderr + String(err) });
    });
    child.on('close', (code) => {
      resolve({ code: code ?? 0, stdout, stderr });
    });
  });
}

async function getStagedFiles() {
  const result = await runCapture('git', [
    'diff',
    '--cached',
    '--name-only',
    '--diff-filter=ACMR',
  ]);
  if (result.code !== 0) {
    warn(`test-staged: git diff failed (${result.code}): ${result.stderr.trim()}`);
    return [];
  }
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function workspaceDirForFile(repoRelativePath) {
  const segments = repoRelativePath.split('/');
  if (segments.length < 3) return null;
  const [topLevel, workspaceName] = segments;
  if (!WORKSPACE_PREFIXES.includes(topLevel)) return null;
  return path.join(topLevel, workspaceName);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function listWorkspaceDirs() {
  const dirs = [];
  for (const prefix of WORKSPACE_PREFIXES) {
    const prefixDir = path.join(repoRoot, prefix);
    for (const entry of readdirSync(prefixDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      dirs.push(path.join(prefix, entry.name));
    }
  }
  return dirs;
}

function workspaceDependencyNames(pkg) {
  return new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
    ...Object.keys(pkg.optionalDependencies ?? {}),
  ]);
}

function loadWorkspaceMeta() {
  const byDir = new Map();
  const byName = new Map();

  for (const workspaceDir of listWorkspaceDirs()) {
    const pkgPath = path.join(repoRoot, workspaceDir, 'package.json');
    let pkg;
    try {
      pkg = readJson(pkgPath);
    } catch {
      continue;
    }
    if (typeof pkg.name !== 'string' || pkg.name.trim() === '') continue;
    const meta = {
      workspaceDir,
      name: pkg.name,
      hasTestScript: typeof pkg.scripts?.test === 'string' && pkg.scripts.test.trim() !== '',
      dependencyNames: workspaceDependencyNames(pkg),
    };
    byDir.set(workspaceDir, meta);
    byName.set(meta.name, meta);
  }

  return { byDir, byName };
}

function collectAffectedTestWorkspaces(changedWorkspaceDirs, workspaceMeta) {
  const reverseDeps = new Map();

  for (const meta of workspaceMeta.byDir.values()) {
    for (const dependencyName of meta.dependencyNames) {
      const dependencyMeta = workspaceMeta.byName.get(dependencyName);
      if (!dependencyMeta) continue;
      if (!reverseDeps.has(dependencyMeta.workspaceDir)) {
        reverseDeps.set(dependencyMeta.workspaceDir, new Set());
      }
      reverseDeps.get(dependencyMeta.workspaceDir).add(meta.workspaceDir);
    }
  }

  const queue = [...changedWorkspaceDirs];
  const visited = new Set(queue);

  while (queue.length > 0) {
    const current = queue.shift();
    const dependents = reverseDeps.get(current);
    if (!dependents) continue;
    for (const dependent of dependents) {
      if (visited.has(dependent)) continue;
      visited.add(dependent);
      queue.push(dependent);
    }
  }

  return Array.from(visited)
    .map((workspaceDir) => workspaceMeta.byDir.get(workspaceDir))
    .filter(Boolean)
    .filter((meta) => meta.hasTestScript)
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function ensureTestDbBuilt() {
  const result = await runCapture('yarn', ['--silent', 'workspace', '@remoola/test-db', 'run', 'build']);
  if (result.code === 0) return true;
  warn('test-staged: failed to build @remoola/test-db for pretest hooks.');
  const output = `${result.stdout}\n${result.stderr}`.trim();
  if (output) warn(output);
  return false;
}

async function runWorkspaceTests(workspace) {
  log(`test-staged: running tests in ${workspace.name}`);
  const result = await runCapture(
    'yarn',
    ['--silent', 'workspace', workspace.name, 'run', 'test'],
    {
      env: {
        ...process.env,
        QUIET_MEMORY_GUARD: '1',
      },
    },
  );

  if (result.code !== 0) {
    warn(`test-staged: ${workspace.name} failed.`);
    const output = `${result.stdout}\n${result.stderr}`.trim();
    if (output) warn(output);
    return false;
  }

  log(`test-staged: ${workspace.name}: ok.`);
  return true;
}

async function main() {
  const stagedFiles = await getStagedFiles();
  const changedWorkspaceDirs = Array.from(
    new Set(stagedFiles.map(workspaceDirForFile).filter(Boolean)),
  );

  if (changedWorkspaceDirs.length === 0) {
    log('test-staged: no staged workspace files; skipping.');
    return 0;
  }

  const workspaceMeta = loadWorkspaceMeta();
  const workspacesToTest = collectAffectedTestWorkspaces(changedWorkspaceDirs, workspaceMeta);

  if (workspacesToTest.length === 0) {
    log('test-staged: no affected workspaces with a test script; skipping.');
    return 0;
  }

  log(
    `test-staged: ${workspacesToTest.length} affected workspace(s) to test (${workspacesToTest
      .map((workspace) => workspace.name)
      .join(', ')}).`,
  );

  if (!(await ensureTestDbBuilt())) {
    return 1;
  }

  for (const workspace of workspacesToTest) {
    const ok = await runWorkspaceTests(workspace);
    if (!ok) return 1;
  }

  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    warn(`test-staged: unexpected failure: ${err?.stack ?? err}`);
    process.exit(1);
  });
