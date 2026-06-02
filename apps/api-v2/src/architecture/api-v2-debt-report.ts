import { readFileSync } from 'fs';
import { join, relative } from 'path';

import {
  adminStepUpVerifyAllowlist,
  bareRouteIdParamsAllowlist,
  nonTransactionalExecuteAllowlist,
} from './boundary-allowlists';
import { listSourceFiles, sourceFileCounts } from './source-scan.utils';

type FileCount = {
  count: number;
  file: string;
};

type FileLoc = {
  file: string;
  loc: number;
};

type AllowlistBucketSummary = {
  bucket: string;
  files: FileCount[];
  totalCount: number;
};

type BoundaryAllowlistSummary = {
  adminStepUpVerify: FileCount[];
  bareRouteIdParams: FileCount[];
  nonTransactionalExecute: AllowlistBucketSummary[];
};

type HttpExceptionSummary = {
  byFile: FileCount[];
  byType: FileCount[];
  totalCount: number;
};

type DateUsageSummary = {
  dateNow: FileCount[];
  newDate: FileCount[];
  totalDateNow: number;
  totalNewDate: number;
};

type ApiV2DebtReport = {
  boundaryAllowlists: BoundaryAllowlistSummary;
  controllerCount: number;
  controllers: string[];
  dateUsage: DateUsageSummary;
  generatedAt: string;
  httpExceptions: HttpExceptionSummary;
  productionFileCount: number;
  rawSqlFiles: FileCount[];
  topProductionFilesByLoc: FileLoc[];
};

const RAW_SQL_PATTERN = /\$(?:queryRaw|executeRaw)(?:Unsafe)?\b/g;
const NEW_DATE_PATTERN = /new\s+Date\s*\(/g;
const DATE_NOW_PATTERN = /Date\.now\s*\(/g;
const EXPLICIT_HTTP_EXCEPTION_PATTERN = /\bnew\s+([A-Za-z]+Exception)\s*\(/g;

const REPORT_TOP_FILES_LIMIT = 10;
const REPORT_IGNORED_FILES = new Set([`architecture/boundary-allowlists.ts`]);

export function buildApiV2DebtReport(appRoot = join(__dirname, `..`)): ApiV2DebtReport {
  const srcDir = join(appRoot, `src`);
  const sourceFiles = listSourceFiles(srcDir).filter((file) => !REPORT_IGNORED_FILES.has(toRelativePath(srcDir, file)));
  const controllerFiles = sourceFiles
    .filter((file) => file.endsWith(`.controller.ts`))
    .map((file) => toRelativePath(srcDir, file))
    .sort();

  return {
    boundaryAllowlists: buildBoundaryAllowlistSummary(),
    controllerCount: controllerFiles.length,
    controllers: controllerFiles,
    dateUsage: {
      dateNow: mapToSortedEntries(sourceFileCounts(srcDir, DATE_NOW_PATTERN)),
      newDate: mapToSortedEntries(sourceFileCounts(srcDir, NEW_DATE_PATTERN)),
      totalDateNow: sumCounts(sourceFileCounts(srcDir, DATE_NOW_PATTERN)),
      totalNewDate: sumCounts(sourceFileCounts(srcDir, NEW_DATE_PATTERN)),
    },
    generatedAt: new Date().toISOString(),
    httpExceptions: collectHttpExceptions(sourceFiles, srcDir),
    productionFileCount: sourceFiles.length,
    rawSqlFiles: mapToSortedEntries(sourceFileCounts(srcDir, RAW_SQL_PATTERN)),
    topProductionFilesByLoc: collectTopProductionFilesByLoc(sourceFiles, srcDir),
  };
}

export function formatApiV2DebtReport(report: ApiV2DebtReport): string {
  const lines: string[] = [];

  lines.push(`API V2 Debt Report`);
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push(`Production files scanned: ${report.productionFileCount}`);
  lines.push(``);

  lines.push(`Top production files by LOC`);
  lines.push(...formatLocEntries(report.topProductionFilesByLoc));
  lines.push(``);

  lines.push(`Raw SQL files`);
  lines.push(`Total occurrences: ${sumCounts(report.rawSqlFiles)}`);
  lines.push(...formatCountEntries(report.rawSqlFiles));
  lines.push(``);

  lines.push(`Date/time usage`);
  lines.push(`new Date(): ${report.dateUsage.totalNewDate}`);
  lines.push(...formatCountEntries(report.dateUsage.newDate));
  lines.push(`Date.now(): ${report.dateUsage.totalDateNow}`);
  lines.push(...formatCountEntries(report.dateUsage.dateNow));
  lines.push(``);

  lines.push(`Explicit HTTP exception counts`);
  lines.push(`Total explicit exception constructions: ${report.httpExceptions.totalCount}`);
  lines.push(`By exception type:`);
  lines.push(...formatCountEntries(report.httpExceptions.byType));
  lines.push(`By file:`);
  lines.push(...formatCountEntries(report.httpExceptions.byFile));
  lines.push(``);

  lines.push(`Controller count`);
  lines.push(`${report.controllerCount}`);
  lines.push(...report.controllers.map((controller) => `- ${controller}`));
  lines.push(``);

  lines.push(`Boundary allowlists summary`);
  lines.push(`Bare route id params`);
  lines.push(...formatCountEntries(report.boundaryAllowlists.bareRouteIdParams));
  lines.push(`Admin step-up verify`);
  lines.push(...formatCountEntries(report.boundaryAllowlists.adminStepUpVerify));
  lines.push(`Non-transactional idempotency.execute allowlist`);
  for (const bucket of report.boundaryAllowlists.nonTransactionalExecute) {
    lines.push(`- ${bucket.bucket}: ${bucket.totalCount} across ${bucket.files.length} files`);
    lines.push(...bucket.files.map((entry) => `  ${entry.file}: ${entry.count}`));
  }

  return lines.join(`\n`);
}

function collectTopProductionFilesByLoc(sourceFiles: string[], srcDir: string): FileLoc[] {
  return sourceFiles
    .map((file) => ({
      file: toRelativePath(srcDir, file),
      loc: readFileSync(file, `utf8`).split(/\r?\n/).length,
    }))
    .sort((left, right) => right.loc - left.loc || left.file.localeCompare(right.file))
    .slice(0, REPORT_TOP_FILES_LIMIT);
}

function collectHttpExceptions(sourceFiles: string[], srcDir: string): HttpExceptionSummary {
  const byFile = new Map<string, number>();
  const byType = new Map<string, number>();

  for (const file of sourceFiles) {
    const source = readFileSync(file, `utf8`);
    const relativeFile = toRelativePath(srcDir, file);
    let fileCount = 0;

    for (const match of source.matchAll(EXPLICIT_HTTP_EXCEPTION_PATTERN)) {
      const exceptionType = match[1];
      fileCount += 1;
      byType.set(exceptionType, (byType.get(exceptionType) ?? 0) + 1);
    }

    if (fileCount > 0) {
      byFile.set(relativeFile, fileCount);
    }
  }

  const byFileEntries = mapToSortedEntries(byFile);
  const byTypeEntries = mapToSortedEntries(byType);

  return {
    byFile: byFileEntries,
    byType: byTypeEntries,
    totalCount: sumCounts(byFileEntries),
  };
}

function buildBoundaryAllowlistSummary(): BoundaryAllowlistSummary {
  return {
    adminStepUpVerify: mapToSortedEntries(adminStepUpVerifyAllowlist),
    bareRouteIdParams: mapToSortedEntries(bareRouteIdParamsAllowlist),
    nonTransactionalExecute: Object.entries(nonTransactionalExecuteAllowlist).map(([bucket, files]) => ({
      bucket,
      files: mapToSortedEntries(files),
      totalCount: sumCounts(files),
    })),
  };
}

function formatCountEntries(entries: FileCount[]): string[] {
  if (entries.length === 0) {
    return [`- none`];
  }
  return entries.map((entry) => `- ${entry.file}: ${entry.count}`);
}

function formatLocEntries(entries: FileLoc[]): string[] {
  if (entries.length === 0) {
    return [`- none`];
  }
  return entries.map((entry) => `- ${entry.file}: ${entry.loc}`);
}

function mapToSortedEntries(counts: Map<string, number>): FileCount[] {
  return [...counts.entries()]
    .map(([file, count]) => ({ count, file }))
    .sort((left, right) => right.count - left.count || left.file.localeCompare(right.file));
}

function sumCounts(entries: Map<string, number> | FileCount[]): number {
  if (entries instanceof Map) {
    return [...entries.values()].reduce((sum, count) => sum + count, 0);
  }
  return entries.reduce((sum, entry) => sum + entry.count, 0);
}

function toRelativePath(rootDir: string, file: string): string {
  return relative(rootDir, file).replace(/\\/g, `/`);
}
