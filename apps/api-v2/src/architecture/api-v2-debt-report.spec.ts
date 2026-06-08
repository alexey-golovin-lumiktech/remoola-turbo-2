import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { buildApiV2DebtReport, formatApiV2DebtReport } from './api-v2-debt-report';

describe(`api-v2 debt report`, () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    jest.useRealTimers();
    for (const root of tempRoots.splice(0)) {
      rmSync(root, { force: true, recursive: true });
    }
  });

  function createFixtureApp(): string {
    const root = mkdtempSync(join(tmpdir(), `api-v2-debt-report-`));
    tempRoots.push(root);

    mkdirSync(join(root, `src`, `controllers`), { recursive: true });
    mkdirSync(join(root, `src`, `services`), { recursive: true });
    mkdirSync(join(root, `src`, `architecture`), { recursive: true });

    writeFileSync(
      join(root, `src`, `controllers`, `example.controller.ts`),
      [
        `export class ExampleController {`,
        `  create() {`,
        `    throw new BadRequestException('bad');`,
        `  }`,
        `}`,
        ``,
      ].join(`\n`),
    );
    writeFileSync(
      join(root, `src`, `services`, `example.service.ts`),
      [
        `export class ExampleService {`,
        `  run(prisma: { $queryRawUnsafe: (...args: unknown[]) => unknown }) {`,
        `    const now = new Date();`,
        `    const later = Date.now();`,
        `    prisma.$queryRawUnsafe('select 1');`,
        `    throw new ConflictException('boom');`,
        `    return { now, later };`,
        `  }`,
        `}`,
        ``,
      ].join(`\n`),
    );
    writeFileSync(
      join(root, `src`, `services`, `large.service.ts`),
      [`export const value = 1;`, `export const value2 = 2;`, `export const value3 = 3;`, ``].join(`\n`),
    );
    writeFileSync(
      join(root, `src`, `architecture`, `boundary-allowlists.ts`),
      [`export const ignored = true;`, ``].join(`\n`),
    );

    return root;
  }

  it(`builds report metrics from production source files and ignores boundary allowlists source`, () => {
    const fixtureRoot = createFixtureApp();
    jest.useFakeTimers().setSystemTime(new Date(`2026-06-08T12:00:00.000Z`));

    const report = buildApiV2DebtReport(fixtureRoot);

    expect(report.generatedAt).toBe(`2026-06-08T12:00:00.000Z`);
    expect(report.productionFileCount).toBe(3);
    expect(report.controllers).toEqual([`controllers/example.controller.ts`]);
    expect(report.controllerCount).toBe(1);
    expect(report.rawSqlFiles).toEqual([{ file: `services/example.service.ts`, count: 2 }]);
    expect(report.dateUsage.newDate).toEqual([{ file: `services/example.service.ts`, count: 1 }]);
    expect(report.dateUsage.dateNow).toEqual([{ file: `services/example.service.ts`, count: 1 }]);
    expect(report.dateUsage.totalNewDate).toBe(1);
    expect(report.dateUsage.totalDateNow).toBe(1);
    expect(report.httpExceptions.byFile).toEqual([
      { file: `controllers/example.controller.ts`, count: 1 },
      { file: `services/example.service.ts`, count: 1 },
    ]);
    expect(report.httpExceptions.byType).toEqual([
      { file: `BadRequestException`, count: 1 },
      { file: `ConflictException`, count: 1 },
    ]);
    expect(report.httpExceptions.totalCount).toBe(2);
    expect(report.topProductionFilesByLoc).toEqual([
      { file: `services/example.service.ts`, loc: 10 },
      { file: `controllers/example.controller.ts`, loc: 6 },
      { file: `services/large.service.ts`, loc: 4 },
    ]);
  });

  it(`formats the report into stable human-readable sections`, () => {
    const fixtureRoot = createFixtureApp();
    jest.useFakeTimers().setSystemTime(new Date(`2026-06-08T12:00:00.000Z`));

    const output = formatApiV2DebtReport(buildApiV2DebtReport(fixtureRoot));

    expect(output).toContain(`API V2 Debt Report`);
    expect(output).toContain(`Generated at: 2026-06-08T12:00:00.000Z`);
    expect(output).toContain(`Production files scanned: 3`);
    expect(output).toContain(`Raw SQL files`);
    expect(output).toContain(`Total occurrences: 2`);
    expect(output).toContain(`- services/example.service.ts: 2`);
    expect(output).toContain(`Date/time usage`);
    expect(output).toContain(`new Date(): 1`);
    expect(output).toContain(`Date.now(): 1`);
    expect(output).toContain(`Explicit HTTP exception counts`);
    expect(output).toContain(`- BadRequestException: 1`);
    expect(output).toContain(`- ConflictException: 1`);
    expect(output).toContain(`Controller count`);
    expect(output).toContain(`controllers/example.controller.ts`);
    expect(output).toContain(`Boundary allowlists summary`);
  });
});
