import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AUDIT_ACTIONS,
  CAPABILITIES,
  CHECK_PATHS,
  FRONTEND_ACTIONS,
  OLD_DOC_TOKENS,
  RECONCILIATION_NOTES,
  ROOT_SCRIPTS,
  ROUTE_TOKENS,
} from './config.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, `../..`);

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), `utf8`);
}

function check(condition, message, failures) {
  if (!condition) {
    failures.push(message);
  }
}

function expectIncludes(haystack, needle, label, failures) {
  check(haystack.includes(needle), `${label}: missing "${needle}"`, failures);
}

function main() {
  const failures = [];

  for (const relativePath of CHECK_PATHS) {
    check(fs.existsSync(path.join(repoRoot, relativePath)), `missing file/path: ${relativePath}`, failures);
  }

  const packageJson = JSON.parse(readRepoFile(`package.json`));
  for (const [scriptName, expectedValue] of Object.entries(ROOT_SCRIPTS)) {
    check(
      packageJson.scripts?.[scriptName] === expectedValue,
      `package.json: script "${scriptName}" should be "${expectedValue}"`,
      failures,
    );
  }

  const preCommit = readRepoFile(`.husky/pre-commit`);
  expectIncludes(preCommit, `node ./scripts/admin-v2-gates/is-affected.mjs --staged`, `.husky/pre-commit`, failures);
  expectIncludes(preCommit, `yarn verify:admin-v2-gates`, `.husky/pre-commit`, failures);

  const docs = readRepoFile(`docs/admin-v2-merge-gates.md`);
  expectIncludes(docs, `yarn verify:admin-v2-gates`, `docs/admin-v2-merge-gates.md`, failures);
  expectIncludes(docs, `yarn test:admin-v2`, `docs/admin-v2-merge-gates.md`, failures);
  expectIncludes(docs, `pre-commit`, `docs/admin-v2-merge-gates.md`, failures);
  expectIncludes(docs, `manual local runs`, `docs/admin-v2-merge-gates.md`, failures);
  expectIncludes(docs, `frontend server-action exports`, `docs/admin-v2-merge-gates.md`, failures);
  expectIncludes(docs, `scripts/typecheck-staged.mjs`, `docs/admin-v2-merge-gates.md`, failures);
  expectIncludes(docs, `SKIP_PRECOMMIT_TYPECHECK`, `docs/admin-v2-merge-gates.md`, failures);
  expectIncludes(docs, `SKIP_PRECOMMIT_LINT`, `docs/admin-v2-merge-gates.md`, failures);
  expectIncludes(docs, `SKIP_PRECOMMIT_TESTS`, `docs/admin-v2-merge-gates.md`, failures);
  expectIncludes(docs, `SKIP_ADMIN_V2_GATES`, `docs/admin-v2-merge-gates.md`, failures);
  expectIncludes(docs, `SKIP_PREPUSH_E2E`, `docs/admin-v2-merge-gates.md`, failures);
  expectIncludes(docs, `@remoola/test-db`, `docs/admin-v2-merge-gates.md`, failures);
  expectIncludes(docs, `scripts/admin-v2-gates/config.mjs`, `docs/admin-v2-merge-gates.md`, failures);
  expectIncludes(docs, `.husky/pre-push`, `docs/admin-v2-merge-gates.md`, failures);
  for (const token of OLD_DOC_TOKENS) {
    check(!docs.includes(token), `docs/admin-v2-merge-gates.md: still mentions old token "${token}"`, failures);
  }

  const auditService = readRepoFile(`apps/api-v2/src/shared/admin-action-audit.service.ts`);
  expectIncludes(auditService, `export const ADMIN_ACTION_AUDIT_ACTIONS = {`, `admin-action-audit.service.ts`, failures);
  for (const action of AUDIT_ACTIONS) {
    expectIncludes(
      auditService,
      `${action}: \`${action}\``,
      `apps/api-v2/src/shared/admin-action-audit.service.ts`,
      failures,
    );
  }

  const accessFile = readRepoFile(`apps/api-v2/src/admin-v2/admin-v2-access.ts`);
  expectIncludes(accessFile, `export const KNOWN_ADMIN_V2_CAPABILITIES: readonly AdminV2Capability[] = [`, `admin-v2-access.ts`, failures);
  for (const capability of CAPABILITIES) {
    expectIncludes(accessFile, `\`${capability}\``, `apps/api-v2/src/admin-v2/admin-v2-access.ts`, failures);
  }

  const mutationsFile = readRepoFile(`apps/admin-v2/src/lib/admin-mutations.server.ts`);
  for (const actionName of FRONTEND_ACTIONS) {
    expectIncludes(
      mutationsFile,
      `export async function ${actionName}`,
      `apps/admin-v2/src/lib/admin-mutations.server.ts`,
      failures,
    );
  }

  for (const [relativePath, tokens] of Object.entries(ROUTE_TOKENS)) {
    const fileContents = readRepoFile(relativePath);
    for (const token of tokens) {
      expectIncludes(fileContents, token, relativePath, failures);
    }
  }

  for (const [relativePath, tokens] of Object.entries(RECONCILIATION_NOTES)) {
    const fileContents = readRepoFile(relativePath);
    for (const token of tokens) {
      expectIncludes(fileContents, token, relativePath, failures);
    }
  }

  if (failures.length > 0) {
    process.stderr.write(`[admin-v2-gates] local checks failed\n`);
    for (const failure of failures) {
      process.stderr.write(`- ${failure}\n`);
    }
    process.exit(1);
  }

  process.stdout.write(`[admin-v2-gates] local checks passed\n`);
  process.stdout.write(`- scripts are wired\n`);
  process.stdout.write(`- pre-commit runs the gate when needed\n`);
  process.stdout.write(`- docs match the current local setup\n`);
  process.stdout.write(`- expected backend and frontend anchors are present\n`);
  process.stdout.write(`- reconciled planning notes are still in place\n`);
}

main();
