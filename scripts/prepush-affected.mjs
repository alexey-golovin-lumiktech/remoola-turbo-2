#!/usr/bin/env node
// Pre-push helper: run lint / e2e only for workspaces affected by the refs
// being pushed. Falls back to full checks when root tooling changes make the
// affected scope ambiguous.

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKSPACE_PREFIXES = ['apps', 'packages'];
const ZERO_OID = /^0+$/;

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
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    if (typeof opts.stdin === 'string') {
      child.stdin.end(opts.stdin);
    } else {
      child.stdin.end();
    }
    child.on('error', (err) => {
      resolve({ code: -1, stdout, stderr: stderr + String(err) });
    });
    child.on('close', (code) => {
      resolve({ code: code ?? 0, stdout, stderr });
    });
  });
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    let settled = false;
    let idleTimer = null;

    function finish() {
      if (settled) return;
      settled = true;
      if (idleTimer) clearTimeout(idleTimer);
      process.stdin.pause();
      resolve(data);
    }

    function armIdleTimeout() {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(finish, 100);
    }

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
      armIdleTimeout();
    });
    process.stdin.on('end', finish);
    process.stdin.resume();
    armIdleTimeout();
  });
}

async function gitStdout(args) {
  const result = await runCapture('git', args);
  if (result.code !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

async function gitFileList(base, head) {
  const result = await runCapture('git', [
    'diff',
    '--name-only',
    '--diff-filter=ACMR',
    base,
    head,
  ]);
  if (result.code !== 0) {
    throw new Error(`git diff ${base} ${head} failed: ${result.stderr.trim()}`);
  }
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parsePushRefs(stdinText) {
  return stdinText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [localRef, localOid, remoteRef, remoteOid] = line.split(/\s+/);
      return { localRef, localOid, remoteRef, remoteOid };
    })
    .filter((ref) => ref.localRef && ref.localOid && ref.remoteRef && ref.remoteOid);
}

async function resolveFallbackBase(localOid) {
  const candidates = [
    ['merge-base', localOid, '@{upstream}'],
    ['merge-base', localOid, 'origin/main'],
    ['rev-parse', `${localOid}^`],
  ];

  for (const args of candidates) {
    const result = await runCapture('git', args);
    if (result.code === 0) {
      return result.stdout.trim();
    }
  }

  return null;
}

async function changedFilesFromPushRefs(pushRefs) {
  const changedFiles = new Set();

  for (const ref of pushRefs) {
    if (ZERO_OID.test(ref.localOid)) continue;

    let base = null;
    if (!ZERO_OID.test(ref.remoteOid)) {
      const mergeBase = await runCapture('git', ['merge-base', ref.remoteOid, ref.localOid]);
      if (mergeBase.code === 0) {
        base = mergeBase.stdout.trim();
      } else {
        base = ref.remoteOid;
      }
    } else {
      base = await resolveFallbackBase(ref.localOid);
    }

    if (!base) continue;

    const files = await gitFileList(base, ref.localOid);
    for (const file of files) changedFiles.add(file);
  }

  return Array.from(changedFiles).sort();
}

async function fallbackChangedFilesForManualRun() {
  const head = await gitStdout(['rev-parse', 'HEAD']);
  const base = await resolveFallbackBase(head);
  if (!base) return [];
  return gitFileList(base, head);
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
      hasLintScript: typeof pkg.scripts?.lint === 'string' && pkg.scripts.lint.trim() !== '',
      hasFastE2E: typeof pkg.scripts?.['test:e2e:fast'] === 'string' && pkg.scripts['test:e2e:fast'].trim() !== '',
      dependencyNames: workspaceDependencyNames(pkg),
    };
    byDir.set(workspaceDir, meta);
    byName.set(meta.name, meta);
  }

  return { byDir, byName };
}

function collectAffectedWorkspaces(changedWorkspaceDirs, workspaceMeta) {
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
    .sort((a, b) => a.name.localeCompare(b.name));
}

function isIgnorableNonWorkspacePath(file) {
  return (
    file.endsWith('.md') ||
    file.startsWith('docs/') ||
    file.startsWith('governance/') ||
    file.startsWith('.cursor/') ||
    file.startsWith('.github/')
  );
}

function requiresGlobalFallback(changedFiles) {
  return changedFiles.some((file) => !workspaceDirForFile(file) && !isIgnorableNonWorkspacePath(file));
}

async function runCommand(cmd, args, opts = {}) {
  const result = await runCapture(cmd, args, opts);
  if (result.code === 0) return true;
  const output = `${result.stdout}\n${result.stderr}`.trim();
  if (output) warn(output);
  return false;
}

async function runLintForWorkspaces(workspaces) {
  const lintTargets = workspaces.filter((workspace) => workspace.hasLintScript);
  if (lintTargets.length === 0) {
    log('prepush-affected: no affected workspaces with a lint script; skipping lint.');
    return true;
  }

  log(
    `prepush-affected: linting ${lintTargets.length} workspace(s) (${lintTargets
      .map((workspace) => workspace.name)
      .join(', ')}).`,
  );

  for (const workspace of lintTargets) {
    log(`prepush-affected: lint ${workspace.name}`);
    const ok = await runCommand('yarn', ['--silent', 'workspace', workspace.name, 'run', 'lint']);
    if (!ok) return false;
  }

  return true;
}

async function runFastE2EForWorkspaces(workspaces) {
  if (process.env.SKIP_PREPUSH_E2E === '1') {
    log('prepush-affected: skipping fast e2e (SKIP_PREPUSH_E2E=1).');
    return true;
  }

  const e2eTargets = workspaces.filter((workspace) => workspace.hasFastE2E);
  if (e2eTargets.length === 0) {
    log('prepush-affected: no affected workspaces with test:e2e:fast; skipping fast e2e.');
    return true;
  }

  log(
    `prepush-affected: running fast e2e for ${e2eTargets.length} workspace(s) (${e2eTargets
      .map((workspace) => workspace.name)
      .join(', ')}).`,
  );

  for (const workspace of e2eTargets) {
    log(`prepush-affected: test:e2e:fast ${workspace.name}`);
    const ok = await runCommand(
      'yarn',
      ['--silent', 'workspace', workspace.name, 'run', 'test:e2e:fast'],
      {
        env: {
          ...process.env,
          QUIET_MEMORY_GUARD: '1',
        },
      },
    );
    if (!ok) return false;
  }

  return true;
}

async function runGlobalFallback() {
  log('prepush-affected: root/tooling changes detected; using full pre-push checks.');

  if (!(await runCommand('yarn', ['--silent', 'lint']))) {
    return false;
  }

  if (process.env.SKIP_PREPUSH_E2E === '1') {
    log('prepush-affected: skipping fast e2e (SKIP_PREPUSH_E2E=1).');
    return true;
  }

  return runCommand(
    'yarn',
    ['--silent', 'workspace', '@remoola/api-v2', 'run', 'test:e2e:fast'],
    {
      env: {
        ...process.env,
        QUIET_MEMORY_GUARD: '1',
      },
    },
  );
}

async function main() {
  const stdinText = await readStdin();
  const pushRefs = parsePushRefs(stdinText);
  const changedFiles =
    pushRefs.length > 0 ? await changedFilesFromPushRefs(pushRefs) : await fallbackChangedFilesForManualRun();

  if (changedFiles.length === 0) {
    log('prepush-affected: no files in pushed commit range; skipping.');
    return 0;
  }

  if (requiresGlobalFallback(changedFiles)) {
    return (await runGlobalFallback()) ? 0 : 1;
  }

  const changedWorkspaceDirs = Array.from(
    new Set(changedFiles.map(workspaceDirForFile).filter(Boolean)),
  );

  if (changedWorkspaceDirs.length === 0) {
    log('prepush-affected: no affected workspaces; skipping.');
    return 0;
  }

  const workspaceMeta = loadWorkspaceMeta();
  const affectedWorkspaces = collectAffectedWorkspaces(changedWorkspaceDirs, workspaceMeta);

  if (!(await runLintForWorkspaces(affectedWorkspaces))) {
    return 1;
  }

  if (!(await runFastE2EForWorkspaces(affectedWorkspaces))) {
    return 1;
  }

  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    warn(`prepush-affected: unexpected failure: ${err?.stack ?? err}`);
    process.exit(1);
  });
