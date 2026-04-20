import { execFileSync } from 'node:child_process';

import { AFFECTED_PATHS } from './config.mjs';

function runGit(args) {
  return execFileSync(`git`, args, {
    encoding: `utf8`,
    stdio: [`ignore`, `pipe`, `pipe`],
  });
}

function parseFileList(output) {
  return output
    .split(`\n`)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getChangedFiles() {
  const stagedOnly = process.argv.includes(`--staged`);

  if (stagedOnly) {
    return parseFileList(runGit([`diff`, `--cached`, `--name-only`, `--diff-filter=ACMR`]));
  }

  const tracked = parseFileList(runGit([`diff`, `--name-only`, `--diff-filter=ACMR`, `HEAD`]));
  const untracked = parseFileList(runGit([`ls-files`, `--others`, `--exclude-standard`]));
  return [...new Set([...tracked, ...untracked])];
}

function isAdminV2Affected(filePath) {
  return AFFECTED_PATHS.some((prefix) => filePath === prefix || filePath.startsWith(prefix));
}

try {
  const changedFiles = getChangedFiles();
  const affectedFiles = changedFiles.filter(isAdminV2Affected);

  if (affectedFiles.length === 0) {
    process.exit(1);
  }

  process.stdout.write(`${affectedFiles.join(`\n`)}\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[admin-v2-gates] failed to inspect git diff: ${message}\n`);
  process.exit(2);
}
