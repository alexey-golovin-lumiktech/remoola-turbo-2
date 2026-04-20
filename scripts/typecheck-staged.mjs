#!/usr/bin/env node
// Pre-commit helper: typecheck only TS/TSX files that are staged.
//
// Strategy:
//  1. Collect staged *.ts/*.tsx files (excluding *.d.ts) via `git diff --cached`.
//  2. Group them by workspace under apps/<name> or packages/<name>.
//  3. For each affected workspace that has both a `typecheck` script and a
//     usable tsconfig, run the workspace's full `tsc --noEmit --pretty false`
//     so types resolve correctly with the entire project graph.
//  4. Parse compiler output, split errors into:
//       - `staged`   -> file path matches a staged file in this workspace
//       - `untouched`-> pre-existing errors in unrelated files
//  5. Exit 1 only if any staged-file errors were found. Pre-existing errors
//     in untouched files become a one-line info notice (they do not block).
//
// Bypass: SKIP_PRECOMMIT_TYPECHECK=1 makes this script a no-op.

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKSPACE_PREFIXES = ['apps', 'packages'];
const TS_EXTENSIONS = new Set(['.ts', '.tsx', '.cts', '.mts']);
const MAX_PARALLEL = 3;

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function warn(msg) {
  process.stderr.write(`${msg}\n`);
}

if (process.env.SKIP_PRECOMMIT_TYPECHECK === '1') {
  log('typecheck-staged: skipped (SKIP_PRECOMMIT_TYPECHECK=1).');
  process.exit(0);
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
  const { code, stdout, stderr } = await runCapture('git', [
    'diff',
    '--cached',
    '--name-only',
    '--diff-filter=ACMR',
  ]);
  if (code !== 0) {
    warn(`typecheck-staged: git diff failed (${code}): ${stderr.trim()}`);
    return [];
  }
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function isLintableTs(file) {
  if (file.endsWith('.d.ts')) return false;
  return TS_EXTENSIONS.has(path.extname(file));
}

function workspaceForFile(repoRelativePath) {
  const segments = repoRelativePath.split('/');
  if (segments.length < 3) return null;
  const [topLevel, name] = segments;
  if (!WORKSPACE_PREFIXES.includes(topLevel)) return null;
  return path.join(topLevel, name);
}

function loadWorkspaceMeta(workspaceDir) {
  const pkgPath = path.join(repoRoot, workspaceDir, 'package.json');
  if (!existsSync(pkgPath)) return null;
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch {
    return null;
  }
  const typecheckScript = pkg?.scripts?.typecheck;
  if (typeof typecheckScript !== 'string' || typecheckScript.trim() === '') {
    return null;
  }
  const tsconfigCandidates = ['tsconfig.typecheck.json', 'tsconfig.json'];
  const tsconfig = tsconfigCandidates.find((candidate) =>
    existsSync(path.join(repoRoot, workspaceDir, candidate)),
  );
  if (!tsconfig) return null;
  return {
    name: pkg.name || workspaceDir,
    workspaceDir,
    tsconfig,
    typecheckScript,
  };
}

function groupByWorkspace(stagedFiles) {
  const groups = new Map();
  for (const repoRelative of stagedFiles) {
    if (!isLintableTs(repoRelative)) continue;
    const workspaceDir = workspaceForFile(repoRelative);
    if (!workspaceDir) continue;
    const meta = loadWorkspaceMeta(workspaceDir);
    if (!meta) continue;
    const fileRelativeToWs = path.relative(
      path.join(repoRoot, workspaceDir),
      path.join(repoRoot, repoRelative),
    );
    if (!groups.has(workspaceDir)) {
      groups.set(workspaceDir, { meta, files: new Set() });
    }
    groups.get(workspaceDir).files.add(fileRelativeToWs);
  }
  return groups;
}

function locateTscBinary(workspaceDir) {
  const candidates = [
    path.join(repoRoot, workspaceDir, 'node_modules', '.bin', 'tsc'),
    path.join(repoRoot, 'node_modules', '.bin', 'tsc'),
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

// tsc --pretty false primary line:
//   path/to/file.ts(35,94): error TS2339: Property 'X' does not exist...
const ERROR_HEADER = /^(.+?)\((\d+),(\d+)\):\s+error\s+TS\d+:\s+.*$/;

function parseTscOutput(output) {
  const lines = output.split('\n');
  const errors = [];
  let current = null;
  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    const match = line.match(ERROR_HEADER);
    if (match) {
      if (current) errors.push(current);
      current = {
        file: match[1].trim(),
        line: Number(match[2]),
        column: Number(match[3]),
        body: [line],
      };
    } else if (current && line.trim() !== '') {
      current.body.push(line);
    } else if (current && line.trim() === '') {
      current.body.push(line);
    }
  }
  if (current) errors.push(current);
  return errors;
}

function normalizeForCompare(p) {
  // Drop leading `./` and normalize separators for cross-platform safety.
  return p.replace(/^\.\//, '').split(path.sep).join('/');
}

async function typecheckWorkspace(group) {
  const { meta, files } = group;
  const tsc = locateTscBinary(meta.workspaceDir);
  if (!tsc) {
    return {
      meta,
      files,
      kind: 'no-tsc',
      stagedErrors: [],
      untouchedCount: 0,
      rawOutput: '',
    };
  }

  // api-types runs `yarn schema:generate && tsc --noEmit`. Mirror that so the
  // generated helpers exist before tsc walks them.
  if (meta.typecheckScript.includes('schema:generate')) {
    const gen = await runCapture('yarn', ['--silent', 'schema:generate'], {
      cwd: path.join(repoRoot, meta.workspaceDir),
    });
    if (gen.code !== 0) {
      return {
        meta,
        files,
        kind: 'schema-failed',
        stagedErrors: [],
        untouchedCount: 0,
        rawOutput: gen.stdout + gen.stderr,
      };
    }
  }

  const args = ['-p', meta.tsconfig, '--noEmit', '--pretty', 'false'];
  const result = await runCapture(tsc, args, {
    cwd: path.join(repoRoot, meta.workspaceDir),
  });
  const output = `${result.stdout}\n${result.stderr}`;
  const allErrors = parseTscOutput(output);

  if (result.code !== 0 && allErrors.length === 0) {
    // tsc failed but we couldn't parse any errors (config error etc.).
    return {
      meta,
      files,
      kind: 'unparsed-failure',
      stagedErrors: [],
      untouchedCount: 0,
      rawOutput: output,
    };
  }

  const stagedSet = new Set(Array.from(files, normalizeForCompare));
  const stagedErrors = [];
  let untouchedCount = 0;
  for (const err of allErrors) {
    if (stagedSet.has(normalizeForCompare(err.file))) {
      stagedErrors.push(err);
    } else {
      untouchedCount += 1;
    }
  }
  return {
    meta,
    files,
    kind: 'ok',
    stagedErrors,
    untouchedCount,
    rawOutput: output,
  };
}

async function runWithLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  const stagedFiles = await getStagedFiles();
  const groups = groupByWorkspace(stagedFiles);
  if (groups.size === 0) {
    log('typecheck-staged: no staged TS/TSX files; skipping.');
    return 0;
  }

  const groupList = Array.from(groups.values());
  const wsNames = groupList.map((g) => g.meta.name).join(', ');
  log(`typecheck-staged: ${groupList.length} workspace(s) to check (${wsNames}).`);

  const results = await runWithLimit(groupList, MAX_PARALLEL, typecheckWorkspace);

  let exitCode = 0;
  for (const result of results) {
    if (!result) continue;
    const { meta, kind, stagedErrors, untouchedCount, rawOutput } = result;

    if (kind === 'no-tsc') {
      warn(`typecheck-staged: ${meta.name}: tsc binary not found; skipping.`);
      continue;
    }

    if (kind === 'schema-failed') {
      warn(`typecheck-staged: ${meta.name}: \`yarn schema:generate\` failed.`);
      if (rawOutput.trim()) warn(rawOutput.trim());
      exitCode = 1;
      continue;
    }

    if (kind === 'unparsed-failure') {
      warn(`typecheck-staged: ${meta.name}: tsc failed without parseable errors.`);
      if (rawOutput.trim()) warn(rawOutput.trim());
      exitCode = 1;
      continue;
    }

    if (stagedErrors.length > 0) {
      warn(`\ntypecheck-staged: ${meta.name}: ${stagedErrors.length} error(s) in staged files`);
      for (const err of stagedErrors) {
        warn(err.body.join('\n'));
      }
      exitCode = 1;
    }

    if (untouchedCount > 0) {
      log(
        `typecheck-staged: ${meta.name}: info: ${untouchedCount} pre-existing TS error(s) in untouched files; run \`yarn workspace ${meta.name} typecheck\` to see them.`,
      );
    }

    if (stagedErrors.length === 0 && untouchedCount === 0) {
      log(`typecheck-staged: ${meta.name}: ok.`);
    }
  }

  return exitCode;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    warn(`typecheck-staged: unexpected failure: ${err?.stack ?? err}`);
    process.exit(1);
  });
