import { readFileSync } from 'fs';

import { expect } from '@jest/globals';
import { MODULE_METADATA } from '@nestjs/common/constants';

export function exportedProviders(moduleClass: object): unknown[] {
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

export function expectSourceNotToContain(file: string, patterns: RegExp[]): void {
  const source = readFileSync(file, `utf8`);
  for (const pattern of patterns) {
    expect(source).not.toMatch(pattern);
  }
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
