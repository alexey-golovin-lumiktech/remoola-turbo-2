import { existsSync, readFileSync } from 'fs';

import { expect } from '@jest/globals';
import { MODULE_METADATA } from '@nestjs/common/constants';

import { controllerFileCounts, sourceFileCounts } from './source-scan.utils';

type FileMatcher = RegExp | string;

function exportedProviders(moduleClass: object): unknown[] {
  return Reflect.getMetadata(MODULE_METADATA.EXPORTS, moduleClass) ?? [];
}

export function expectExactExports(moduleClass: object, expected: unknown[]): void {
  expect(new Set(exportedProviders(moduleClass))).toEqual(new Set(expected));
}

export function expectNotExported(moduleClass: object, forbidden: unknown[]): void {
  const exported = new Set(exportedProviders(moduleClass));
  for (const provider of forbidden) {
    expect(exported.has(provider)).toBe(false);
  }
}

export function expectNoSourceMatches(directory: string, pattern: RegExp): void {
  expect(sourceFileCounts(directory, pattern)).toEqual(new Map());
}

export function expectSourceMatchesAllowlist(directory: string, pattern: RegExp, allowlist: Map<string, number>): void {
  expect(sourceFileCounts(directory, pattern)).toEqual(allowlist);
}

export function expectNoControllerMatches(directory: string, pattern: RegExp): void {
  expect(controllerFileCounts(directory, pattern)).toEqual(new Map());
}

export function expectControllerMatchesAllowlist(
  directory: string,
  pattern: RegExp,
  allowlist: Map<string, number>,
): void {
  expect(controllerFileCounts(directory, pattern)).toEqual(allowlist);
}

export function expectFileContains(path: string, matcher: FileMatcher): void {
  const source = readFileSync(path, `utf8`);
  if (typeof matcher === `string`) {
    expect(source).toContain(matcher);
    return;
  }
  expect(source).toMatch(matcher);
}

export function expectFileNotContains(path: string, matcher: FileMatcher): void {
  const source = readFileSync(path, `utf8`);
  if (typeof matcher === `string`) {
    expect(source).not.toContain(matcher);
    return;
  }
  expect(source).not.toMatch(matcher);
}

export function expectFileMissing(path: string): void {
  expect(existsSync(path)).toBe(false);
}

export function mergeAllowlistBuckets(buckets: Record<string, Map<string, number>>): Map<string, number> {
  const merged = new Map<string, number>();
  for (const [bucket, files] of Object.entries(buckets)) {
    expect(files.size).toBeGreaterThan(0);
    for (const [file, count] of files.entries()) {
      expect(merged.has(file)).toBe(false);
      expect(count).toBeGreaterThan(0);
      merged.set(file, count);
    }
    expect([`external-effect`, `legacy-db-only`, `post-commit-event`]).toContain(bucket);
  }
  return merged;
}
