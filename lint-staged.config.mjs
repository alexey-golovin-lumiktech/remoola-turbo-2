import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

// Workspaces under these prefixes have their own ESLint flat config and
// should be linted in-workspace so config discovery resolves correctly.
const WORKSPACE_PREFIXES = ['apps', 'packages'];

const LINTABLE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
]);

function quoteShellArg(value) {
  if (value === '') return `''`;
  if (/^[A-Za-z0-9_./@\-+:=]+$/.test(value)) return value;
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

// Mirror each workspace's existing strictness: apps that use
// `--max-warnings 0` in their `lint` script keep that contract, others stay
// lax. This avoids escalating warnings into commit-blocking errors.
function workspaceLintFlags(workspaceDir) {
  try {
    const pkgPath = path.join(repoRoot, workspaceDir, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const lintScript = pkg?.scripts?.lint ?? '';
    const flags = ['--fix'];
    const maxWarningsMatch = lintScript.match(/--max-warnings[\s=](\d+)/);
    if (maxWarningsMatch) {
      flags.push('--max-warnings', maxWarningsMatch[1]);
    }
    return flags;
  } catch {
    return ['--fix'];
  }
}

function groupByWorkspace(files) {
  const groups = new Map();

  for (const absolutePath of files) {
    const relative = path.relative(repoRoot, absolutePath);
    if (relative.startsWith('..')) continue;

    const segments = relative.split(path.sep);
    if (segments.length < 3) continue;

    const [topLevel, workspaceName] = segments;
    if (!WORKSPACE_PREFIXES.includes(topLevel)) continue;

    const workspaceDir = path.join(topLevel, workspaceName);
    const workspaceConfig = path.join(repoRoot, workspaceDir, 'eslint.config.mjs');
    if (!existsSync(workspaceConfig)) continue;

    const fileRelativeToWorkspace = path.relative(
      path.join(repoRoot, workspaceDir),
      absolutePath,
    );

    if (!groups.has(workspaceDir)) groups.set(workspaceDir, []);
    groups.get(workspaceDir).push(fileRelativeToWorkspace);
  }

  return groups;
}

function lintCommand(workspaceDir, relativeFiles) {
  // Run eslint from the workspace directory so flat-config discovery picks
  // up the local eslint.config.mjs (ESLint v9 searches upward from cwd, not
  // from each file's location).
  const flags = workspaceLintFlags(workspaceDir).map(quoteShellArg).join(' ');
  const args = relativeFiles.map(quoteShellArg).join(' ');
  return `sh -c "cd ${quoteShellArg(workspaceDir)} && ../../node_modules/.bin/eslint ${flags} ${args}"`;
}

export default {
  '{apps,packages}/**/*.{ts,tsx,js,jsx,mjs,cjs}': (files) => {
    const lintable = files.filter((file) =>
      LINTABLE_EXTENSIONS.has(path.extname(file)),
    );
    if (lintable.length === 0) return [];

    const groups = groupByWorkspace(lintable);
    if (groups.size === 0) return [];

    return Array.from(groups, ([workspaceDir, relativeFiles]) =>
      lintCommand(workspaceDir, relativeFiles),
    );
  },
  '*.{md,json,yml,yaml}': ['prettier --write --log-level=warn'],
};
