import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

import { describe, expect, it } from '@jest/globals';

const SRC_ROOT = join(__dirname, `..`);

function walk(dir: string, predicate: (relPath: string) => boolean): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...walk(full, predicate));
      continue;
    }
    const rel = relative(SRC_ROOT, full).split(sep).join(`/`);
    if (predicate(rel)) {
      out.push(rel);
    }
  }
  return out;
}

function readSource(relFromSrc: string): string {
  return readFileSync(join(SRC_ROOT, relFromSrc), `utf8`);
}

const SOURCE_FILES = walk(SRC_ROOT, (rel) => /\.(ts|tsx)$/.test(rel) && !rel.endsWith(`.d.ts`));

describe(`admin-v2 architecture guardrails`, () => {
  it(`forbids direct identity?.capabilities.includes outside the central helper`, () => {
    const ALLOWED = new Set([
      `lib/admin-capabilities.ts`,
      `lib/admin-capabilities.test.ts`,
      `lib/architecture-guardrails.test.ts`,
    ]);
    const needle = `capabilities` + `.includes(`;
    const violations = SOURCE_FILES.filter((rel) => !ALLOWED.has(rel) && readSource(rel).includes(needle));
    expect(violations).toEqual([]);
  });

  it(`forbids Idempotency-Key construction outside admin-mutations core`, () => {
    const ALLOWED = new Set([
      `lib/admin-mutations/core.server.ts`,
      `lib/admin-mutations/core.server.test.ts`,
      `lib/architecture-guardrails.test.ts`,
    ]);
    const needle = `Idempotency` + `-Key`;
    const violations = SOURCE_FILES.filter((rel) => !ALLOWED.has(rel) && readSource(rel).includes(needle));
    expect(violations).toEqual([]);
  });

  it(`keeps route page.tsx files under the orchestration size threshold`, () => {
    const PAGE_TSX_LOC_LIMIT = 350;
    const pages = SOURCE_FILES.filter((rel) => rel.startsWith(`app/`) && rel.endsWith(`/page.tsx`));
    const offenders = pages
      .map((rel) => ({ rel, loc: readSource(rel).split(`\n`).length }))
      .filter(({ loc }) => loc > PAGE_TSX_LOC_LIMIT);
    expect(offenders).toEqual([]);
  });
});
