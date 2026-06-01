import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

export function listRepositoryFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      files.push(...listRepositoryFiles(path));
      continue;
    }
    if (entry.endsWith(`.repository.ts`) && !entry.endsWith(`.spec.ts`)) {
      files.push(path);
    }
  }
  return files.sort();
}

export function listSourceFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      files.push(...listSourceFiles(path));
      continue;
    }
    if (entry.endsWith(`.ts`) && !entry.endsWith(`.spec.ts`)) {
      files.push(path);
    }
  }
  return files.sort();
}

export function sourceFileCounts(directory: string, pattern: RegExp): Map<string, number> {
  const counts = new Map<string, number>();
  for (const file of listSourceFiles(directory)) {
    const source = readFileSync(file, `utf8`);
    const count = source.match(pattern)?.length ?? 0;
    if (count > 0) {
      counts.set(relative(directory, file).replace(/\\/g, `/`), count);
    }
  }
  return counts;
}

export function controllerFileCounts(directory: string, pattern: RegExp): Map<string, number> {
  const counts = new Map<string, number>();
  for (const file of listSourceFiles(directory).filter((path) => path.endsWith(`.controller.ts`))) {
    const source = readFileSync(file, `utf8`);
    const count = source.match(pattern)?.length ?? 0;
    if (count > 0) {
      counts.set(relative(directory, file).replace(/\\/g, `/`), count);
    }
  }
  return counts;
}
